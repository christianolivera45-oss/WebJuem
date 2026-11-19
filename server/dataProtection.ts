import crypto from "crypto";
import fs from "fs";
import path from "path";

export const CRITICAL_FINANCIAL_FIELDS = [
  "precioCompra",
  "precioCon40",
  "comisionML",
  "comisionMP",
  "precioVentaML",
  "precioWeb"
] as const;

export const CRITICAL_PRODUCT_FIELDS = [
  "precioCompra",
  "precioCon40",
  "comisionML",
  "comisionMP",
  "precioVentaML",
  "precioWeb",
  "price",
  "originalPrice",
  "descuentoPorcentaje",
  "stock",
  "stockPinamar",
  "stockMontevideo",
  "calcWebPriceFromML",
  "gtin",
  "paused"
] as const;

export const AUDIT_TRACKED_FIELDS = [
  "name",
  "price",
  "originalPrice",
  "precioCompra",
  "precioCon40",
  "comisionML",
  "comisionMP",
  "precioVentaML",
  "precioWeb",
  "descuentoPorcentaje",
  "stock",
  "stockPinamar",
  "stockMontevideo",
  "paused",
  "active"
] as const;

export interface MergeProtectedOptions {
  allowZeroFields?: string[];
  allowIntentionalZero?: boolean;
  onBlockedZero?: (details: { productId: string; codigo: string; field: string; previousValue: number }) => void;
}

export function stripConfidentialProductFields(p: any): any {
  if (!p || typeof p !== "object") return p;
  const {
    precioCompra,
    precioCon40,
    comisionML,
    comisionMP,
    precioVentaML,
    stockPinamar,
    stockMontevideo,
    calcWebPriceFromML,
    ...rest
  } = p;

  if (Array.isArray(rest.variants)) {
    rest.variants = rest.variants.map((v: any) => {
      if (!v || typeof v !== "object") return v;
      const { stockPinamar: _vp, stockMontevideo: _vm, ...cleanVar } = v;
      return cleanVar;
    });
  }
  return rest;
}

export function mergeProtectedProductUpdate(
  existing: any | undefined,
  incoming: any,
  options: MergeProtectedOptions = {}
): any {
  if (!incoming || typeof incoming !== "object") return incoming;
  if (!existing || typeof existing !== "object") return incoming;

  const merged: any = { ...existing, ...incoming };
  const allowZeroSet = new Set((options.allowZeroFields || []).map((f) => String(f)));

  // Preserve any omitted/undefined/null critical field from existing
  for (const key of CRITICAL_PRODUCT_FIELDS) {
    const incomingVal = incoming[key];
    if (incomingVal === undefined || incomingVal === null || incomingVal === "") {
      if (existing[key] !== undefined) {
        merged[key] = existing[key];
      }
      continue;
    }

    // Reject accidental 0 on positive financial fields unless explicitly authorized
    if (
      (CRITICAL_FINANCIAL_FIELDS as readonly string[]).includes(key) &&
      typeof incomingVal === "number" &&
      incomingVal === 0
    ) {
      const prevNum = Number(existing[key] || 0);
      if (prevNum > 0 && !options.allowIntentionalZero && !allowZeroSet.has(key)) {
        merged[key] = existing[key];
        options.onBlockedZero?.({
          productId: String(existing.id || incoming.id || ""),
          codigo: String(existing.codigo || incoming.codigo || ""),
          field: key,
          previousValue: prevNum
        });
      }
    } else if (
      (CRITICAL_FINANCIAL_FIELDS as readonly string[]).includes(key) &&
      Number(incomingVal) === 0 &&
      !Number.isNaN(Number(incomingVal))
    ) {
      const prevNum = Number(existing[key] || 0);
      if (prevNum > 0 && !options.allowIntentionalZero && !allowZeroSet.has(key)) {
        merged[key] = existing[key];
        options.onBlockedZero?.({
          productId: String(existing.id || incoming.id || ""),
          codigo: String(existing.codigo || incoming.codigo || ""),
          field: key,
          previousValue: prevNum
        });
      }
    }
  }

  // Merge variants safely so omitted variant branch stocks or missing fields never become 0
  if (incoming.variants === undefined && existing.variants !== undefined) {
    merged.variants = existing.variants;
  } else if (Array.isArray(incoming.variants) && Array.isArray(existing.variants)) {
    merged.variants = incoming.variants.map((v: any) => {
      const matchVar = existing.variants.find(
        (ev: any) =>
          (v.id && ev.id && String(ev.id) === String(v.id)) ||
          (v.sku && ev.sku && String(ev.sku).trim().toUpperCase() === String(v.sku).trim().toUpperCase())
      );
      if (!matchVar) return v;
      const hasIncomingImages = v.imagenes !== undefined || v.imageUrl !== undefined;
      return {
        ...matchVar,
        ...v,
        imageUrl: hasIncomingImages ? v.imageUrl : matchVar.imageUrl,
        imagenes:
          v.imagenes !== undefined
            ? v.imagenes
            : v.imageUrl !== undefined
            ? (v.imageUrl ? [v.imageUrl] : [])
            : matchVar.imagenes,
        stock: v.stock !== undefined && v.stock !== null ? v.stock : matchVar.stock,
        stockPinamar: v.stockPinamar !== undefined && v.stockPinamar !== null ? v.stockPinamar : matchVar.stockPinamar,
        stockMontevideo:
          v.stockMontevideo !== undefined && v.stockMontevideo !== null ? v.stockMontevideo : matchVar.stockMontevideo
      };
    });
  }

  return merged;
}

export async function ensureProtectionTables(pool: any): Promise<void> {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.system_backups (
      id VARCHAR(120) PRIMARY KEY,
      backup_type VARCHAR(40) NOT NULL DEFAULT 'manual',
      reason TEXT,
      products_count INTEGER NOT NULL DEFAULT 0,
      checksum VARCHAR(128) NOT NULL,
      snapshot JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.product_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      product_id INTEGER,
      codigo VARCHAR(100),
      product_name TEXT,
      field_name VARCHAR(100) NOT NULL,
      old_value TEXT,
      new_value TEXT,
      operation VARCHAR(120) NOT NULL,
      actor VARCHAR(80) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.system_alerts (
      id BIGSERIAL PRIMARY KEY,
      severity VARCHAR(20) NOT NULL DEFAULT 'warning',
      alert_type VARCHAR(80) NOT NULL,
      product_id INTEGER,
      codigo VARCHAR(100),
      message TEXT NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      acknowledged BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_product_created ON public.product_audit_logs (product_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON public.product_audit_logs (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_backups_type_created ON public.system_backups (backup_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_ack_created ON public.system_alerts (acknowledged, created_at DESC);
  `);
}

function getBackupsDir(dataDir: string): string {
  const dir = path.join(dataDir, "backups");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function computeProductsChecksum(products: any[]): string {
  const canonical = (products || [])
    .slice()
    .sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0))
    .map((p) => ({
      id: String(p?.id || ""),
      codigo: String(p?.codigo || ""),
      name: String(p?.name || ""),
      price: Number(p?.price || 0),
      precioWeb: Number(p?.precioWeb || 0),
      precioCompra: Number(p?.precioCompra || 0),
      precioCon40: Number(p?.precioCon40 || 0),
      comisionML: Number(p?.comisionML || 0),
      comisionMP: Number(p?.comisionMP || 0),
      precioVentaML: Number(p?.precioVentaML || 0),
      stock: Number(p?.stock || 0),
      stockPinamar: Number(p?.stockPinamar || 0),
      stockMontevideo: Number(p?.stockMontevideo || 0),
      variants: (p?.variants || []).map((v: any) => ({
        sku: v?.sku || "",
        stock: Number(v?.stock || 0),
        stockPinamar: Number(v?.stockPinamar || 0),
        stockMontevideo: Number(v?.stockMontevideo || 0)
      }))
    }));
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function appendAuditFallback(dataDir: string, entries: any[]): void {
  if (!entries.length) return;
  try {
    const file = path.join(dataDir, "audit_logs.json");
    let existing: any[] = [];
    if (fs.existsSync(file)) {
      try {
        existing = JSON.parse(fs.readFileSync(file, "utf-8")) || [];
      } catch {
        existing = [];
      }
    }
    const merged = [...entries, ...existing].slice(0, 2000);
    fs.writeFileSync(file, JSON.stringify(merged, null, 2), "utf-8");
  } catch (err) {
    console.warn("No se pudo guardar audit_logs.json:", err);
  }
}

function appendAlertFallback(dataDir: string, alert: any): void {
  try {
    const file = path.join(dataDir, "system_alerts.json");
    let existing: any[] = [];
    if (fs.existsSync(file)) {
      try {
        existing = JSON.parse(fs.readFileSync(file, "utf-8")) || [];
      } catch {
        existing = [];
      }
    }
    const merged = [alert, ...existing].slice(0, 500);
    fs.writeFileSync(file, JSON.stringify(merged, null, 2), "utf-8");
  } catch (err) {
    console.warn("No se pudo guardar system_alerts.json:", err);
  }
}

export async function recordSystemAlert(
  pool: any,
  dataDir: string,
  alert: {
    severity: "critical" | "warning" | "info";
    alertType: string;
    productId?: number | string | null;
    codigo?: string | null;
    message: string;
    details?: Record<string, any>;
  }
): Promise<void> {
  const pidNum = alert.productId !== undefined && alert.productId !== null && !isNaN(Number(alert.productId))
    ? Number(alert.productId)
    : null;
  const createdAt = new Date().toISOString();

  appendAlertFallback(dataDir, {
    id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...alert,
    productId: pidNum,
    acknowledged: false,
    createdAt
  });

  console.warn(`[JUEM ALERT][${alert.severity.toUpperCase()}][${alert.alertType}] ${alert.message}`);

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO public.system_alerts (severity, alert_type, product_id, codigo, message, details)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [alert.severity, alert.alertType, pidNum, alert.codigo || null, alert.message, JSON.stringify(alert.details || {})]
      );
    } catch (err) {
      console.error("Error persisting system_alert:", err);
    }
  }
}

export async function logProductChanges(
  pool: any,
  dataDir: string,
  oldProd: any | null | undefined,
  newProd: any | null | undefined,
  operation: string,
  actor: string = "admin"
): Promise<Array<{ fieldName: string; oldValue: string; newValue: string }>> {
  const changes: Array<{ fieldName: string; oldValue: string; newValue: string }> = [];
  if (!newProd && !oldProd) return changes;

  const pid = Number(newProd?.id || oldProd?.id || 0) || null;
  const codigo = String(newProd?.codigo || oldProd?.codigo || "");
  const productName = String(newProd?.name || oldProd?.name || "");

  if (!oldProd && newProd) {
    changes.push({
      fieldName: "created",
      oldValue: "",
      newValue: JSON.stringify({
        codigo,
        precioCompra: newProd.precioCompra ?? 0,
        precioVentaML: newProd.precioVentaML ?? 0,
        precioWeb: newProd.precioWeb ?? newProd.price ?? 0,
        stock: newProd.stock ?? 0
      })
    });
  } else if (oldProd && !newProd) {
    changes.push({
      fieldName: "active",
      oldValue: "true",
      newValue: "false"
    });
  } else if (oldProd && newProd) {
    for (const field of AUDIT_TRACKED_FIELDS) {
      const oldV = oldProd[field];
      const newV = newProd[field];
      const oldNorm = oldV === undefined || oldV === null ? "" : String(oldV);
      const newNorm = newV === undefined || newV === null ? "" : String(newV);
      if (oldNorm !== newNorm) {
        changes.push({ fieldName: field, oldValue: oldNorm, newValue: newNorm });
      }
    }

    const oldVars = JSON.stringify(
      (oldProd.variants || []).map((v: any) => ({
        sku: v.sku || "",
        stock: Number(v.stock || 0),
        stockPinamar: Number(v.stockPinamar || 0),
        stockMontevideo: Number(v.stockMontevideo || 0)
      }))
    );
    const newVars = JSON.stringify(
      (newProd.variants || []).map((v: any) => ({
        sku: v.sku || "",
        stock: Number(v.stock || 0),
        stockPinamar: Number(v.stockPinamar || 0),
        stockMontevideo: Number(v.stockMontevideo || 0)
      }))
    );
    if (oldVars !== newVars) {
      changes.push({ fieldName: "variants", oldValue: oldVars, newValue: newVars });
    }

    const oldVarGalleries = JSON.stringify(
      (oldProd.variants || []).map((v: any) => ({
        sku: v.sku || "",
        color: v.color || "",
        size: v.size || "",
        imageUrl: v.imageUrl || "",
        imagenes: Array.isArray(v.imagenes) ? v.imagenes : (v.imageUrl ? [v.imageUrl] : [])
      }))
    );
    const newVarGalleries = JSON.stringify(
      (newProd.variants || []).map((v: any) => ({
        sku: v.sku || "",
        color: v.color || "",
        size: v.size || "",
        imageUrl: v.imageUrl || "",
        imagenes: Array.isArray(v.imagenes) ? v.imagenes : (v.imageUrl ? [v.imageUrl] : [])
      }))
    );
    if (oldVarGalleries !== newVarGalleries) {
      changes.push({ fieldName: "variant_galleries", oldValue: oldVarGalleries, newValue: newVarGalleries });
    }
  }

  if (changes.length === 0) return changes;

  const nowIso = new Date().toISOString();
  appendAuditFallback(
    dataDir,
    changes.map((c) => ({
      productId: pid,
      codigo,
      productName,
      fieldName: c.fieldName,
      oldValue: c.oldValue,
      newValue: c.newValue,
      operation,
      actor,
      createdAt: nowIso
    }))
  );

  if (pool) {
    for (const c of changes) {
      try {
        await pool.query(
          `INSERT INTO public.product_audit_logs (product_id, codigo, product_name, field_name, old_value, new_value, operation, actor)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
          [pid, codigo, productName, c.fieldName, c.oldValue, c.newValue, operation, actor]
        );
      } catch (err) {
        console.error("Error writing product_audit_logs:", err);
      }
    }
  }

  return changes;
}

export async function detectProductTransitionAnomalies(
  pool: any,
  dataDir: string,
  oldProd: any,
  newProd: any,
  operation: string
): Promise<void> {
  if (!oldProd || !newProd) return;
  const pid = Number(newProd.id || oldProd.id) || null;
  const codigo = String(newProd.codigo || oldProd.codigo || "");

  if (Number(oldProd.precioCompra || 0) > 0 && Number(newProd.precioCompra || 0) === 0) {
    await recordSystemAlert(pool, dataDir, {
      severity: "critical",
      alertType: "unexpected_zero_cost",
      productId: pid,
      codigo,
      message: `El costo (precioCompra) de ${codigo || newProd.name} pasó de $${oldProd.precioCompra} a $0 durante ${operation}.`,
      details: { previous: oldProd.precioCompra, current: newProd.precioCompra, operation }
    });
  }

  if (Number(oldProd.precioCon40 || 0) > 0 && Number(newProd.precioCon40 || 0) === 0) {
    await recordSystemAlert(pool, dataDir, {
      severity: "critical",
      alertType: "unexpected_zero_cost",
      productId: pid,
      codigo,
      message: `El costo +40% (precioCon40) de ${codigo || newProd.name} pasó de $${oldProd.precioCon40} a $0 durante ${operation}.`,
      details: { previous: oldProd.precioCon40, current: newProd.precioCon40, operation }
    });
  }

  if (Number(oldProd.comisionML || 0) > 0 && Number(newProd.comisionML || 0) === 0) {
    await recordSystemAlert(pool, dataDir, {
      severity: "warning",
      alertType: "unexpected_zero_commission",
      productId: pid,
      codigo,
      message: `La comisión ML de ${codigo || newProd.name} pasó de $${oldProd.comisionML} a $0 durante ${operation}.`,
      details: { previous: oldProd.comisionML, current: newProd.comisionML, operation }
    });
  }

  if (Number(oldProd.precioVentaML || 0) > 0 && Number(newProd.precioVentaML || 0) === 0) {
    await recordSystemAlert(pool, dataDir, {
      severity: "warning",
      alertType: "unexpected_zero_ml_price",
      productId: pid,
      codigo,
      message: `El precioVentaML de ${codigo || newProd.name} pasó de $${oldProd.precioVentaML} a $0 durante ${operation}.`,
      details: { previous: oldProd.precioVentaML, current: newProd.precioVentaML, operation }
    });
  }

  if (Number(oldProd.precioWeb || 0) > 0 && Number(newProd.precioWeb || 0) === 0) {
    await recordSystemAlert(pool, dataDir, {
      severity: "critical",
      alertType: "unexpected_zero_web_price",
      productId: pid,
      codigo,
      message: `El precioWeb de ${codigo || newProd.name} pasó de $${oldProd.precioWeb} a $0 durante ${operation}.`,
      details: { previous: oldProd.precioWeb, current: newProd.precioWeb, operation }
    });
  }
}

export async function createSystemBackup(
  pool: any,
  dataDir: string,
  state: any,
  options: { backupType: "daily" | "pre_bulk" | "pre_restore" | "manual"; reason: string }
): Promise<{ id: string; backupType: string; productsCount: number; checksum: string; createdAt: string }> {
  const products = Array.isArray(state?.products) ? state.products : [];
  const checksum = computeProductsChecksum(products);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const id = `bkp-${options.backupType}-${ts}`;
  const createdAt = new Date().toISOString();

  // Strip sensitive session token before storing backup snapshot
  const safeState = {
    products: JSON.parse(JSON.stringify(products)),
    categories: state?.categories || [],
    dbCategories: state?.dbCategories || [],
    dbSubcategories: state?.dbSubcategories || [],
    coupons: state?.coupons || [],
    settings: state?.settings || {},
    stockAdjustments: state?.stockAdjustments || []
  };

  const backupRecord = {
    id,
    backupType: options.backupType,
    reason: options.reason,
    productsCount: products.length,
    checksum,
    createdAt,
    snapshot: safeState
  };

  try {
    const dir = getBackupsDir(dataDir);
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(backupRecord, null, 2), "utf-8");

    // Keep disk backups bounded to 40 newest files
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();
    for (const staleFile of files.slice(40)) {
      try {
        fs.unlinkSync(path.join(dir, staleFile));
      } catch {}
    }
  } catch (fsErr) {
    console.error("Error writing disk backup:", fsErr);
  }

  if (pool) {
    await pool.query(
      `INSERT INTO public.system_backups (id, backup_type, reason, products_count, checksum, snapshot, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [id, options.backupType, options.reason, products.length, checksum, JSON.stringify(safeState), createdAt]
    );

    // Retention in DB: keep latest 30 daily/pre_bulk snapshots
    await pool.query(`
      DELETE FROM public.system_backups
      WHERE backup_type IN ('daily', 'pre_bulk')
        AND id NOT IN (
          SELECT id FROM public.system_backups
          WHERE backup_type IN ('daily', 'pre_bulk')
          ORDER BY created_at DESC
          LIMIT 30
        );
    `).catch(() => {});
  }

  return { id, backupType: options.backupType, productsCount: products.length, checksum, createdAt };
}

export async function getBackupById(pool: any, dataDir: string, backupId: string): Promise<any | null> {
  if (pool) {
    const res = await pool.query(
      `SELECT id, backup_type, reason, products_count, checksum, snapshot, created_at
       FROM public.system_backups WHERE id = $1 LIMIT 1;`,
      [backupId]
    );
    if (res.rows.length > 0) {
      const r = res.rows[0];
      return {
        id: r.id,
        backupType: r.backup_type,
        reason: r.reason,
        productsCount: Number(r.products_count),
        checksum: r.checksum,
        snapshot: typeof r.snapshot === "string" ? JSON.parse(r.snapshot) : r.snapshot,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
      };
    }
  }

  const filePath = path.join(getBackupsDir(dataDir), `${path.basename(backupId)}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return null;
}

export async function listBackups(pool: any, dataDir: string): Promise<any[]> {
  if (pool) {
    const res = await pool.query(
      `SELECT id, backup_type, reason, products_count, checksum, created_at
       FROM public.system_backups
       ORDER BY created_at DESC
       LIMIT 50;`
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      backupType: r.backup_type,
      reason: r.reason,
      productsCount: Number(r.products_count),
      checksum: r.checksum,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
    }));
  }

  const dir = getBackupsDir(dataDir);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, 50)
    .map((f) => {
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
        return {
          id: parsed.id,
          backupType: parsed.backupType,
          reason: parsed.reason,
          productsCount: parsed.productsCount,
          checksum: parsed.checksum,
          createdAt: parsed.createdAt
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function verifyBackupIntegrity(
  pool: any,
  dataDir: string,
  backupId: string
): Promise<{
  valid: boolean;
  backupId: string;
  checksumMatch: boolean;
  productsCount: number;
  withCostCount: number;
  errors: string[];
}> {
  const bkp = await getBackupById(pool, dataDir, backupId);
  if (!bkp) {
    return {
      valid: false,
      backupId,
      checksumMatch: false,
      productsCount: 0,
      withCostCount: 0,
      errors: ["Respaldo no encontrado."]
    };
  }

  const errors: string[] = [];
  const products = bkp.snapshot?.products;
  if (!Array.isArray(products) || products.length === 0) {
    errors.push("El snapshot no contiene una lista válida de productos.");
  }

  const recomputed = Array.isArray(products) ? computeProductsChecksum(products) : "";
  const checksumMatch = Boolean(bkp.checksum && recomputed === bkp.checksum);
  if (!checksumMatch) {
    errors.push(`Checksum no coincide (esperado ${bkp.checksum}, calculado ${recomputed}).`);
  }

  let withCostCount = 0;
  if (Array.isArray(products)) {
    for (const p of products) {
      if (!p.id || !p.name) {
        errors.push(`Producto inválido en snapshot: ${JSON.stringify({ id: p?.id, codigo: p?.codigo })}`);
      }
      if (Number(p?.precioCompra || 0) > 0) withCostCount++;
    }
  }

  return {
    valid: errors.length === 0,
    backupId,
    checksumMatch,
    productsCount: Array.isArray(products) ? products.length : 0,
    withCostCount,
    errors
  };
}

export function diffProductsAgainstSnapshot(liveProducts: any[], snapshotProducts: any[]) {
  const liveById = new Map<string, any>((liveProducts || []).map((p) => [String(p.id), p]));
  const snapById = new Map<string, any>((snapshotProducts || []).map((p) => [String(p.id), p]));
  const diffs: Array<{
    productId: string;
    codigo: string;
    name: string;
    changes: Array<{ field: string; backupValue: any; liveValue: any }>;
  }> = [];

  for (const [id, bp] of snapById.entries()) {
    const lp = liveById.get(id);
    if (!lp) {
      diffs.push({
        productId: id,
        codigo: bp.codigo || "",
        name: bp.name || "",
        changes: [{ field: "existence", backupValue: "present", liveValue: "missing" }]
      });
      continue;
    }

    const fieldChanges: Array<{ field: string; backupValue: any; liveValue: any }> = [];
    for (const f of ["precioCompra", "precioCon40", "comisionML", "comisionMP", "precioVentaML", "precioWeb", "price", "stock"]) {
      const bv = Number(bp[f] ?? 0);
      const lv = Number(lp[f] ?? 0);
      if (bv !== lv) {
        fieldChanges.push({ field: f, backupValue: bv, liveValue: lv });
      }
    }
    if (fieldChanges.length > 0) {
      diffs.push({
        productId: id,
        codigo: lp.codigo || bp.codigo || "",
        name: lp.name || bp.name || "",
        changes: fieldChanges
      });
    }
  }

  return diffs;
}

export async function scanCatalogAnomaliesAgainstBackup(
  pool: any,
  dataDir: string,
  liveProducts: any[]
): Promise<{
  checkedAt: string;
  backupId: string | null;
  anomalies: Array<{ productId: string; codigo: string; field: string; backupValue: number; liveValue: number }>;
}> {
  const backups = await listBackups(pool, dataDir);
  if (backups.length === 0) {
    return { checkedAt: new Date().toISOString(), backupId: null, anomalies: [] };
  }

  const latestBkp = await getBackupById(pool, dataDir, backups[0].id);
  const snapProducts = latestBkp?.snapshot?.products || [];
  const diffs = diffProductsAgainstSnapshot(liveProducts, snapProducts);
  const anomalies: Array<{ productId: string; codigo: string; field: string; backupValue: number; liveValue: number }> = [];

  for (const d of diffs) {
    for (const c of d.changes) {
      if (
        ["precioCompra", "precioCon40", "comisionML", "precioVentaML", "precioWeb", "price"].includes(c.field) &&
        Number(c.backupValue) > 0 &&
        Number(c.liveValue) === 0
      ) {
        anomalies.push({
          productId: d.productId,
          codigo: d.codigo,
          field: c.field,
          backupValue: Number(c.backupValue),
          liveValue: Number(c.liveValue)
        });
      }
    }
  }

  if (anomalies.length > 0) {
    await recordSystemAlert(pool, dataDir, {
      severity: "critical",
      alertType: "backup_drift",
      message: `Se detectaron ${anomalies.length} campos críticos en $0 respecto al último respaldo (${latestBkp.id}).`,
      details: { backupId: latestBkp.id, anomalies }
    });
  }

  return { checkedAt: new Date().toISOString(), backupId: latestBkp.id, anomalies };
}

export async function ensureDailyBackup(pool: any, dataDir: string, state: any): Promise<{ created: boolean; backupId?: string }> {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date());
  const existing = await listBackups(pool, dataDir);
  const hasTodayDaily = existing.some((b: any) => {
    if (b.backupType !== "daily" || !b.createdAt) return false;
    const bDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(new Date(b.createdAt));
    return bDate === todayStr;
  });

  if (hasTodayDaily) {
    return { created: false };
  }

  const created = await createSystemBackup(pool, dataDir, state, {
    backupType: "daily",
    reason: `Respaldo automático diario (${todayStr})`
  });
  return { created: true, backupId: created.id };
}
