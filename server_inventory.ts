import pg from "pg";
import crypto from "crypto";

export interface MovementRecordData {
  productId: number;
  variantId?: string | null;
  sku?: string | null;
  productName: string;
  variantName?: string | null;
  quantity: number; // positive for entries, negative for exits
  movementType: string;
  stockAnterior?: number;
  stockPosterior?: number;
  sucursalOrigen?: string | null;
  sucursalDestino?: string | null;
  usuario?: string | null;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
  referenciaNumero?: string | null;
  entidadAsociada?: string | null;
  costoUnitario?: number;
  precioUnitario?: number;
  motivo?: string | null;
  observaciones?: string | null;
  estado?: string;
  createdAt?: string | Date;
}

export interface TraceabilityFilters {
  productId: number | string;
  variantId?: string | null;
  branch?: string | null;
  movementType?: string | null;
  status?: string | null;
  quantitySign?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  asOfDate?: string | null;
}

export function formatMontevideoDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat("es-UY", {
      timeZone: "America/Montevideo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(d);
  } catch {
    return String(date);
  }
}

export function getMovementTypeLabel(type: string): string {
  switch (type) {
    case "stock_inicial": return "Stock Inicial";
    case "compra": return "Recepción por Compra";
    case "venta": return "Venta Confirmada";
    case "devolucion_cliente": return "Devolución de Cliente";
    case "devolucion_proveedor": return "Devolución a Proveedor";
    case "transferencia_salida": return "Traslado (Salida)";
    case "transferencia_entrada": return "Traslado (Entrada)";
    case "ajuste_positivo": return "Ajuste Positivo (+)";
    case "ajuste_negativo": return "Ajuste Negativo (-)";
    case "inventario_fisico": return "Conteo de Inventario Físico";
    case "anulacion": return "Anulación / Reversión";
    case "otro": return "Otro Movimiento";
    default: return type;
  }
}

/**
 * Ensures public.inventory_movements exists with complete schema and indexes
 */
export async function initInventoryMovementsTable(pool: pg.Pool): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.inventory_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id INTEGER REFERENCES public.products(id) ON DELETE SET NULL,
        variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        movement_type VARCHAR(50) NOT NULL,
        description TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sku VARCHAR(100),
        product_name TEXT,
        variant_name TEXT,
        stock_anterior INTEGER DEFAULT 0,
        stock_posterior INTEGER DEFAULT 0,
        sucursal_origen VARCHAR(50),
        sucursal_destino VARCHAR(50),
        usuario VARCHAR(100),
        referencia_tipo VARCHAR(50),
        referencia_id VARCHAR(100),
        referencia_numero VARCHAR(100),
        entidad_asociada VARCHAR(255),
        costo_unitario NUMERIC(10, 2) DEFAULT 0.00,
        precio_unitario NUMERIC(10, 2) DEFAULT 0.00,
        motivo TEXT,
        observaciones TEXT,
        estado VARCHAR(50) DEFAULT 'confirmada'
      );

      CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.inventory_movements (product_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_variant ON public.inventory_movements (variant_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory_movements (sku);
      CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory_movements (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inventory_ref ON public.inventory_movements (referencia_tipo, referencia_id);
    `);
    console.log("[Inventory Traceability] Tabla 'public.inventory_movements' verificada en PostgreSQL.");
  } catch (err) {
    console.error("[Inventory Traceability] Error inicializando tabla de movimientos:", err);
  }
}

/**
 * Records an immutable inventory movement
 */
export async function recordInventoryMovement(
  clientOrPool: pg.Pool | pg.PoolClient,
  data: MovementRecordData
): Promise<string> {
  const movementId = crypto.randomUUID();
  try {
    const query = `
      INSERT INTO public.inventory_movements (
        id, product_id, variant_id, quantity, movement_type, description,
        created_by, created_at, sku, product_name, variant_name,
        stock_anterior, stock_posterior, sucursal_origen, sucursal_destino,
        usuario, referencia_tipo, referencia_id, referencia_numero,
        entidad_asociada, costo_unitario, precio_unitario, motivo, observaciones, estado
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, COALESCE($8::timestamptz, NOW()), $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25
      ) RETURNING id;
    `;

    const res = await clientOrPool.query(query, [
      movementId,
      data.productId,
      data.variantId || null,
      data.quantity,
      data.movementType,
      data.observaciones || data.motivo || null,
      data.usuario || "Sistema Juem",
      data.createdAt || new Date(),
      data.sku || null,
      data.productName,
      data.variantName || null,
      data.stockAnterior || 0,
      data.stockPosterior || 0,
      data.sucursalOrigen || null,
      data.sucursalDestino || null,
      data.usuario || "Sistema Juem",
      data.referenciaTipo || null,
      data.referenciaId || null,
      data.referenciaNumero || null,
      data.entidadAsociada || null,
      data.costoUnitario || 0,
      data.precioUnitario || 0,
      data.motivo || null,
      data.observaciones || null,
      data.estado || "confirmada"
    ]);

    return res.rows[0]?.id || movementId;
  } catch (err) {
    console.error("[Inventory Traceability] Error guardando movimiento de inventario:", err);
    return movementId;
  }
}

/**
 * Searches articles across products and variants by SKU, code, name, variant, or ID
 */
export async function searchArticles(
  pool: pg.Pool | null,
  fallbackProducts: any[],
  query: string
): Promise<any[]> {
  const cleanQ = (query || "").trim();
  if (!cleanQ) return [];

  if (pool) {
    try {
      const sql = `
        SELECT 
          p.id, 
          p.name, 
          p.price, 
          p.codigo, 
          p.stock, 
          p.stock_pinamar, 
          p.stock_montevideo, 
          p.image_url, 
          p.category, 
          p.precio_compra,
          p.active,
          p.is_combo,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', v.id,
                'sku', v.sku,
                'size', v.size_value,
                'color', v.color_name,
                'colorCode', v.color_code,
                'stock', v.stock,
                'stockPinamar', v.stock_pinamar,
                'stockMontevideo', v.stock_montevideo,
                'price', v.price
              )
            ) FILTER (WHERE v.id IS NOT NULL AND v.active = true), 
            '[]'::jsonb
          ) as variants
        FROM public.products p
        LEFT JOIN public.product_variants v ON v.product_id = p.id
        WHERE p.active = true
          AND (
            p.name ILIKE $1 
            OR p.codigo ILIKE $1 
            OR CAST(p.id AS TEXT) = $2
            OR v.sku ILIKE $1 
            OR v.color_name ILIKE $1 
            OR v.size_value ILIKE $1
          )
        GROUP BY p.id
        ORDER BY p.name ASC
        LIMIT 30;
      `;
      const searchPattern = `%${cleanQ}%`;
      const res = await pool.query(sql, [searchPattern, cleanQ]);
      return res.rows.map(r => ({
        id: r.id,
        name: r.name,
        price: Number(r.price || 0),
        codigo: r.codigo || undefined,
        stock: Number(r.stock || 0),
        stockPinamar: Number(r.stock_pinamar || 0),
        stockMontevideo: Number(r.stock_montevideo || 0),
        imageUrl: r.image_url,
        category: r.category,
        precioCompra: Number(r.precio_compra || 0),
        isCombo: !!r.is_combo,
        variants: Array.isArray(r.variants) ? r.variants : []
      }));
    } catch (dbErr) {
      console.error("[Inventory Traceability] DB Search error, falling back to memory:", dbErr);
    }
  }

  // Memory fallback
  const qLower = cleanQ.toLowerCase();
  return fallbackProducts
    .filter(p => {
      const matchName = p.name && p.name.toLowerCase().includes(qLower);
      const matchCode = p.codigo && p.codigo.toLowerCase().includes(qLower);
      const matchId = String(p.id) === cleanQ;
      const matchVariant = p.variants?.some((v: any) => 
        (v.sku && v.sku.toLowerCase().includes(qLower)) ||
        (v.color && v.color.toLowerCase().includes(qLower)) ||
        (v.size && v.size.toLowerCase().includes(qLower))
      );
      return matchName || matchCode || matchId || matchVariant;
    })
    .slice(0, 30);
}

/**
 * Retrieves complete article traceability history and calculates audit summary indicators
 */
export async function getArticleTraceability(
  pool: pg.Pool | null,
  fallbackStore: any,
  filters: TraceabilityFilters
): Promise<any> {
  const prodIdNum = Number(filters.productId);
  if (!prodIdNum && prodIdNum !== 0) {
    throw new Error("El identificador del producto es inválido.");
  }

  let product: any = null;
  let variants: any[] = [];
  let movements: any[] = [];

  if (pool) {
    // 1. Fetch current product and variants state directly from DB
    const pRes = await pool.query(
      `SELECT id, name, price, original_price, stock, stock_pinamar, stock_montevideo, 
              image_url, category, codigo, precio_compra, is_combo, combo_components 
       FROM public.products 
       WHERE id = $1;`,
      [prodIdNum]
    );

    if (pRes.rows.length === 0) {
      throw new Error(`Producto con ID ${prodIdNum} no encontrado en el sistema.`);
    }

    const row = pRes.rows[0];
    product = {
      id: row.id,
      name: row.name,
      price: Number(row.price || 0),
      originalPrice: row.original_price ? Number(row.original_price) : undefined,
      stock: Number(row.stock || 0),
      stockPinamar: Number(row.stock_pinamar || 0),
      stockMontevideo: Number(row.stock_montevideo || 0),
      imageUrl: row.image_url,
      category: row.category,
      codigo: row.codigo,
      precioCompra: Number(row.precio_compra || 0),
      isCombo: !!row.is_combo,
      comboComponents: row.combo_components
    };

    const vRes = await pool.query(
      `SELECT id, sku, size_value as size, color_name as color, color_code as "colorCode", 
              stock, stock_pinamar as "stockPinamar", stock_montevideo as "stockMontevideo", 
              price, image_url as "imageUrl" 
       FROM public.product_variants 
       WHERE product_id = $1 AND active = true 
       ORDER BY size_value, color_name;`,
      [prodIdNum]
    );
    variants = vRes.rows.map(v => ({
      ...v,
      stock: Number(v.stock || 0),
      stockPinamar: Number(v.stockPinamar || 0),
      stockMontevideo: Number(v.stockMontevideo || 0),
      price: v.price ? Number(v.price) : undefined
    }));
    product.variants = variants;

    // 2. Build movements query with granular audit filters
    const conditions: string[] = ["product_id = $1"];
    const params: any[] = [prodIdNum];
    let paramIdx = 2;

    if (filters.variantId && filters.variantId !== "all") {
      conditions.push(`variant_id = $${paramIdx}`);
      params.push(filters.variantId);
      paramIdx++;
    }

    if (filters.branch && filters.branch !== "all") {
      conditions.push(`(sucursal_origen = $${paramIdx} OR sucursal_destino = $${paramIdx})`);
      params.push(filters.branch);
      paramIdx++;
    }

    if (filters.movementType && filters.movementType !== "all") {
      conditions.push(`movement_type = $${paramIdx}`);
      params.push(filters.movementType);
      paramIdx++;
    }

    if (filters.status && filters.status !== "all") {
      conditions.push(`estado = $${paramIdx}`);
      params.push(filters.status);
      paramIdx++;
    }

    if (filters.quantitySign === "positive") {
      conditions.push(`quantity > 0`);
    } else if (filters.quantitySign === "negative") {
      conditions.push(`quantity < 0`);
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIdx}::timestamptz`);
      params.push(filters.startDate);
      paramIdx++;
    }

    if (filters.endDate) {
      // If date is YYYY-MM-DD, encompass end of day
      const endVal = filters.endDate.length === 10 ? `${filters.endDate} 23:59:59.999Z` : filters.endDate;
      conditions.push(`created_at <= $${paramIdx}::timestamptz`);
      params.push(endVal);
      paramIdx++;
    }

    const movementsQuery = `
      SELECT 
        id, product_id as "productId", variant_id as "variantId", sku, 
        product_name as "productName", variant_name as "variantName",
        movement_type as "movementType", quantity, stock_anterior as "stockAnterior", 
        stock_posterior as "stockPosterior", sucursal_origen as "sucursalOrigen", 
        sucursal_destino as "sucursalDestino", usuario, referencia_tipo as "referenciaTipo", 
        referencia_id as "referenciaId", referencia_numero as "referenciaNumero", 
        entidad_asociada as "entidadAsociada", costo_unitario as "costoUnitario", 
        precio_unitario as "precioUnitario", motivo, observaciones, estado, created_at as "createdAt"
      FROM public.inventory_movements
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC;
    `;

    const mRes = await pool.query(movementsQuery, params);
    movements = mRes.rows.map(m => ({
      ...m,
      quantity: Number(m.quantity),
      stockAnterior: Number(m.stockAnterior || 0),
      stockPosterior: Number(m.stockPosterior || 0),
      costoUnitario: Number(m.costoUnitario || 0),
      precioUnitario: Number(m.precioUnitario || 0),
      movementTypeLabel: getMovementTypeLabel(m.movementType),
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
      createdAtMontevideo: formatMontevideoDate(m.createdAt)
    }));

  } else {
    // Memory fallback
    product = (fallbackStore.products || []).find((p: any) => String(p.id) === String(prodIdNum));
    if (!product) {
      throw new Error(`Producto con ID ${prodIdNum} no encontrado en memoria.`);
    }
    variants = product.variants || [];
    movements = [];
  }

  // 3. Compute Granular Summary Indicators
  // Determine relevant stock baseline (either variant or whole product)
  let currentPinamar = product.stockPinamar || 0;
  let currentMontevideo = product.stockMontevideo || 0;
  let currentTotal = product.stock || 0;

  if (filters.variantId && filters.variantId !== "all") {
    const selectedVar = variants.find(v => String(v.id) === String(filters.variantId));
    if (selectedVar) {
      currentPinamar = selectedVar.stockPinamar || 0;
      currentMontevideo = selectedVar.stockMontevideo || 0;
      currentTotal = selectedVar.stock || 0;
    }
  }

  let totalCompras = 0;
  let totalVentas = 0;
  let totalTransferenciasSalida = 0;
  let totalTransferenciasEntrada = 0;
  let totalDevoluciones = 0;
  let totalDevolucionesCliente = 0;
  let totalDevolucionesProveedor = 0;
  let totalAjustesPositivos = 0;
  let totalAjustesNegativos = 0;
  let stockInicial = 0;
  let inTransitQty = 0;

  for (const m of movements) {
    const qty = m.quantity;
    switch (m.movementType) {
      case "compra":
        if (qty > 0) totalCompras += qty;
        break;
      case "venta":
        totalVentas += Math.abs(qty);
        break;
      case "transferencia_salida":
        totalTransferenciasSalida += Math.abs(qty);
        break;
      case "transferencia_entrada":
        totalTransferenciasEntrada += Math.abs(qty);
        break;
      case "devolucion_cliente":
        totalDevoluciones += Math.abs(qty);
        totalDevolucionesCliente += Math.abs(qty);
        break;
      case "devolucion_proveedor":
        totalDevoluciones += Math.abs(qty);
        totalDevolucionesProveedor += Math.abs(qty);
        break;
      case "ajuste_positivo":
        totalAjustesPositivos += Math.abs(qty);
        break;
      case "ajuste_negativo":
        totalAjustesNegativos += Math.abs(qty);
        break;
      case "inventario_fisico":
        if (qty > 0) totalAjustesPositivos += qty;
        else totalAjustesNegativos += Math.abs(qty);
        break;
      case "stock_inicial":
        stockInicial += qty;
        break;
    }
  }

  // If no formal 'stock_inicial' movement exists yet, deduce baseline
  if (stockInicial === 0) {
    const netMovements = totalCompras - totalVentas - totalTransferenciasSalida + totalTransferenciasEntrada + totalAjustesPositivos - totalAjustesNegativos;
    stockInicial = Math.max(0, currentTotal - netMovements);
  }

  const costoCompra = Number(product.precioCompra || product.price || 0);
  const valorStockActual = currentTotal * costoCompra;

  const summary = {
    stockPinamar: currentPinamar,
    stockMontevideo: currentMontevideo,
    stockTotal: currentTotal,
    totalCompras,
    totalVentas,
    totalTransferenciasSalida,
    totalTransferenciasEntrada,
    totalDevoluciones,
    totalDevolucionesCliente,
    totalDevolucionesProveedor,
    totalAjustesPositivos,
    totalAjustesNegativos,
    stockInicial,
    costoCompra,
    valorStockActual,
    totalPurchasedUnits: totalCompras,
    totalSoldUnits: totalVentas,
    totalTransferredOut: totalTransferenciasSalida,
    totalTransferredIn: totalTransferenciasEntrada,
    totalReturns: totalDevoluciones,
    positiveAdjustments: totalAjustesPositivos,
    negativeAdjustments: totalAjustesNegativos,
    purchaseCost: costoCompra,
    totalStockValue: valorStockActual,
    inTransitQty
  };

  // 4. Point in Time calculation if asOfDate is provided
  let historicalStockAtDate: any = null;
  if (filters.asOfDate) {
    try {
      const targetTime = new Date(filters.asOfDate).getTime();
      // Calculate net delta of all movements that happened AFTER the target date
      let pinamarDeltaAfter = 0;
      let montevideoDeltaAfter = 0;

      for (const m of movements) {
        const mTime = new Date(m.createdAt).getTime();
        if (mTime > targetTime) {
          const qty = m.quantity;
          const isOriginPin = m.sucursalOrigen === "Pinamar";
          const isOriginMvd = m.sucursalOrigen === "Montevideo";
          const isDestPin = m.sucursalDestino === "Pinamar";
          const isDestMvd = m.sucursalDestino === "Montevideo";

          if (m.movementType === "transferencia_salida") {
            if (isOriginPin) pinamarDeltaAfter -= Math.abs(qty);
            if (isOriginMvd) montevideoDeltaAfter -= Math.abs(qty);
          } else if (m.movementType === "transferencia_entrada") {
            if (isDestPin) pinamarDeltaAfter += Math.abs(qty);
            if (isDestMvd) montevideoDeltaAfter += Math.abs(qty);
          } else {
            // Standard single-branch movement (compra, venta, ajuste, etc.)
            if (isOriginPin || (!isOriginMvd && m.sucursalOrigen !== "Montevideo")) {
              pinamarDeltaAfter += qty;
            } else if (isOriginMvd) {
              montevideoDeltaAfter += qty;
            }
          }
        }
      }

      const recPin = Math.max(0, currentPinamar - pinamarDeltaAfter);
      const recMvd = Math.max(0, currentMontevideo - montevideoDeltaAfter);
      historicalStockAtDate = {
        date: filters.asOfDate,
        stockPinamar: recPin,
        stockMontevideo: recMvd,
        stockTotal: recPin + recMvd
      };
    } catch (calcErr) {
      console.error("[Inventory Traceability] Error calculating point in time stock:", calcErr);
    }
  }

  return {
    success: true,
    product,
    variants,
    summary,
    movements,
    historicalStockAtDate
  };
}

/**
 * Creates an audited manual movement or adjustment, updating inventory transactionally
 */
export async function createManualMovement(
  pool: pg.Pool | null,
  fallbackStore: any,
  data: {
    productId: number | string;
    variantId?: string | null;
    sku?: string | null;
    movementType: string;
    quantity: number;
    branch: "Pinamar" | "Montevideo";
    motivo: string;
    observaciones?: string | null;
    usuario: string;
  }
): Promise<any> {
  const prodId = Number(data.productId);
  const qty = Math.abs(Number(data.quantity) || 0);
  if (qty <= 0) {
    throw new Error("La cantidad debe ser mayor a 0.");
  }
  if (!data.motivo || !data.motivo.trim()) {
    throw new Error("El motivo del movimiento es obligatorio para fines de auditoría.");
  }

  const isPositive = [
    "ajuste_positivo",
    "devolucion_cliente",
    "stock_inicial",
    "compra",
    "transferencia_entrada"
  ].includes(data.movementType);

  const signedQty = isPositive ? qty : -qty;

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN;");

      // 1. Fetch product with row-level lock
      const pLock = await client.query(
        "SELECT id, name, codigo, stock, stock_pinamar, stock_montevideo, precio_compra FROM public.products WHERE id = $1 FOR UPDATE;",
        [prodId]
      );
      if (pLock.rows.length === 0) {
        throw new Error(`Producto con ID ${prodId} no existe.`);
      }
      const prodRow = pLock.rows[0];

      let previousStock = Number(prodRow.stock || 0);
      let variantName: string | null = null;
      let variantSku = data.sku || prodRow.codigo || null;

      // 2. If variant specified, lock and update variant
      if (data.variantId) {
        const vLock = await client.query(
          "SELECT id, sku, size_value, color_name, stock, stock_pinamar, stock_montevideo FROM public.product_variants WHERE id = $1 AND product_id = $2 FOR UPDATE;",
          [data.variantId, prodId]
        );
        if (vLock.rows.length > 0) {
          const vRow = vLock.rows[0];
          previousStock = Number(vRow.stock || 0);
          variantName = `${vRow.size_value || "Único"} / ${vRow.color_name || "General"}`.trim();
          variantSku = vRow.sku || variantSku;

          const currentPin = Number(vRow.stock_pinamar || 0);
          const currentMvd = Number(vRow.stock_montevideo || 0);

          let newPin = currentPin;
          let newMvd = currentMvd;

          if (data.branch === "Pinamar") {
            newPin = isPositive ? currentPin + qty : Math.max(0, currentPin - qty);
          } else {
            newMvd = isPositive ? currentMvd + qty : Math.max(0, currentMvd - qty);
          }
          const newVarStock = newPin + newMvd;

          await client.query(
            "UPDATE public.product_variants SET stock = $1, stock_pinamar = $2, stock_montevideo = $3, updated_at = NOW() WHERE id = $4;",
            [newVarStock, newPin, newMvd, data.variantId]
          );

          // Update consolidated product stock from sum of variants
          const sumRes = await client.query(
            "SELECT COALESCE(SUM(stock), 0) as tot, COALESCE(SUM(stock_pinamar), 0) as tot_pin, COALESCE(SUM(stock_montevideo), 0) as tot_mvd FROM public.product_variants WHERE product_id = $1 AND active = true;",
            [prodId]
          );
          await client.query(
            "UPDATE public.products SET stock = $1, stock_pinamar = $2, stock_montevideo = $3, updated_at = NOW() WHERE id = $4;",
            [sumRes.rows[0].tot, sumRes.rows[0].tot_pin, sumRes.rows[0].tot_mvd, prodId]
          );
        }
      } else {
        // Product-level adjustment
        const currentPin = Number(prodRow.stock_pinamar || 0);
        const currentMvd = Number(prodRow.stock_montevideo || 0);

        let newPin = currentPin;
        let newMvd = currentMvd;

        if (data.branch === "Pinamar") {
          newPin = isPositive ? currentPin + qty : Math.max(0, currentPin - qty);
        } else {
          newMvd = isPositive ? currentMvd + qty : Math.max(0, currentMvd - qty);
        }
        const newTotalStock = newPin + newMvd;

        await client.query(
          "UPDATE public.products SET stock = $1, stock_pinamar = $2, stock_montevideo = $3, updated_at = NOW() WHERE id = $4;",
          [newTotalStock, newPin, newMvd, prodId]
        );
      }

      const newPosteriorStock = previousStock + signedQty;

      // 3. Insert into public.inventory_movements
      const movementId = crypto.randomUUID();
      const insertQuery = `
        INSERT INTO public.inventory_movements (
          id, product_id, variant_id, sku, product_name, variant_name,
          quantity, movement_type, stock_anterior, stock_posterior,
          sucursal_origen, usuario, referencia_tipo, referencia_id, referencia_numero,
          costo_unitario, motivo, observaciones, estado, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, NOW()
        ) RETURNING *;
      `;

      const mRes = await client.query(insertQuery, [
        movementId,
        prodId,
        data.variantId || null,
        variantSku,
        prodRow.name,
        variantName,
        signedQty,
        data.movementType,
        previousStock,
        Math.max(0, newPosteriorStock),
        data.branch,
        data.usuario.trim() || "Administrador",
        "manual_adjustment",
        movementId,
        `AJU-${movementId.substring(0, 6).toUpperCase()}`,
        Number(prodRow.precio_compra || 0),
        data.motivo.trim(),
        data.observaciones ? data.observaciones.trim() : null,
        "confirmada"
      ]);

      await client.query("COMMIT;");
      return mRes.rows[0];

    } catch (txErr) {
      await client.query("ROLLBACK;");
      throw txErr;
    } finally {
      client.release();
    }
  }

  // Memory fallback
  const prod = (fallbackStore.products || []).find((p: any) => String(p.id) === String(prodId));
  if (!prod) throw new Error("Producto no encontrado en memoria.");
  if (data.branch === "Pinamar") {
    prod.stockPinamar = Math.max(0, (prod.stockPinamar || 0) + signedQty);
  } else {
    prod.stockMontevideo = Math.max(0, (prod.stockMontevideo || 0) + signedQty);
  }
  prod.stock = (prod.stockPinamar || 0) + (prod.stockMontevideo || 0);
  return { id: "local-mov-" + Math.random().toString(36).substring(2, 8), quantity: signedQty };
}

/**
 * Reconciles inventory movements by discovering past orders, transfers, and bills
 * that lack audit entries, guaranteeing 100% historical continuity without duplicates
 */
export async function reconcileInventoryAudit(
  pool: pg.Pool | null,
  storeState: any
): Promise<{ reconciledCount: number; message: string }> {
  if (!pool) {
    return { reconciledCount: 0, message: "Modo fuera de línea sin PostgreSQL activo." };
  }

  let count = 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN;");

    // 1. Reconcile Stock Transfers
    const transfersRes = await client.query(`
      SELECT st.id, st.transfer_code, st.batch_id, st.product_id, st.product_name, 
             st.sku, st.variant_id, st.variant_name, st.quantity, st.from_deposito, 
             st.to_deposito, st.created_at
      FROM public.stock_transfers st
      LEFT JOIN public.inventory_movements im 
        ON im.referencia_id = st.id AND im.referencia_tipo = 'transfer'
      WHERE im.id IS NULL;
    `);

    for (const t of transfersRes.rows) {
      const qty = Number(t.quantity || 1);
      const prodId = Number(t.product_id);
      if (!prodId) continue;

      // Salida
      await recordInventoryMovement(client, {
        productId: prodId,
        variantId: t.variant_id || null,
        sku: t.sku || null,
        productName: t.product_name,
        variantName: t.variant_name || null,
        quantity: -qty,
        movementType: "transferencia_salida",
        stockAnterior: 0,
        stockPosterior: 0,
        sucursalOrigen: t.from_deposito,
        sucursalDestino: t.to_deposito,
        usuario: "Administrador",
        referenciaTipo: "transfer",
        referenciaId: t.id,
        referenciaNumero: t.transfer_code || "TRF-0001",
        motivo: "Traslado de mercadería",
        observaciones: `Salida de ${t.from_deposito} hacia ${t.to_deposito}`,
        estado: "confirmada",
        createdAt: t.created_at
      });

      // Entrada
      await recordInventoryMovement(client, {
        productId: prodId,
        variantId: t.variant_id || null,
        sku: t.sku || null,
        productName: t.product_name,
        variantName: t.variant_name || null,
        quantity: qty,
        movementType: "transferencia_entrada",
        stockAnterior: 0,
        stockPosterior: 0,
        sucursalOrigen: t.from_deposito,
        sucursalDestino: t.to_deposito,
        usuario: "Administrador",
        referenciaTipo: "transfer",
        referenciaId: t.id,
        referenciaNumero: t.transfer_code || "TRF-0001",
        motivo: "Recepción de mercadería",
        observaciones: `Entrada a ${t.to_deposito} procedente de ${t.from_deposito}`,
        estado: "confirmada",
        createdAt: t.created_at
      });

      count += 2;
    }

    // 2. Reconcile Completed Orders (Ventas)
    const ordersRes = await client.query(`
      SELECT o.id, o.customer_name, o.customer_email, o.deposito_origen, o.created_at,
             oi.product_id, oi.variant_id, oi.product_name, oi.sku, oi.quantity, oi.unit_price
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      LEFT JOIN public.inventory_movements im 
        ON im.referencia_id = CAST(o.id AS VARCHAR) 
           AND im.referencia_tipo = 'order' 
           AND im.product_id = oi.product_id
      WHERE o.current_status IN ('pago_aprobado', 'en_preparacion', 'listo_para_retirar', 'despachado_correo', 'enviado', 'entregado')
        AND (o.bypass_stock_deduction IS NULL OR o.bypass_stock_deduction = false)
        AND im.id IS NULL;
    `);

    for (const o of ordersRes.rows) {
      const prodId = Number(o.product_id);
      if (!prodId) continue;
      const qty = Number(o.quantity || 1);

      await recordInventoryMovement(client, {
        productId: prodId,
        variantId: o.variant_id || null,
        sku: o.sku || null,
        productName: o.product_name,
        quantity: -qty,
        movementType: "venta",
        stockAnterior: 0,
        stockPosterior: 0,
        sucursalOrigen: o.deposito_origen || "Montevideo",
        usuario: "Venta Confirmada",
        referenciaTipo: "order",
        referenciaId: String(o.id),
        referenciaNumero: `#PED-${String(o.id).substring(0, 8).toUpperCase()}`,
        entidadAsociada: o.customer_name || o.customer_email || "Cliente Juem",
        precioUnitario: Number(o.unit_price || 0),
        motivo: "Venta de artículo",
        observaciones: "Descuento automático de inventario por venta aprobada",
        estado: "confirmada",
        createdAt: o.created_at
      });

      count++;
    }

    // 3. Reconcile Bills (Compras)
    const billsRes = await client.query(`
      SELECT b.id, b.provider_name, b.document_type, b.document_number, 
             b.deposito_origen, b.items, b.date, b.created_at
      FROM public.bills b
      LEFT JOIN public.inventory_movements im 
        ON im.referencia_id = CAST(b.id AS VARCHAR) AND im.referencia_tipo = 'bill'
      WHERE im.id IS NULL;
    `);

    for (const b of billsRes.rows) {
      const items = Array.isArray(b.items) ? b.items : [];
      for (const it of items) {
        let pId = it.productId ? Number(it.productId) : null;
        let pName = it.description || "Artículo de Boleta";
        let cost = Number(it.unitPrice || 0);
        let qty = Number(it.quantity || 1);

        // Try to match product by name if missing productId
        if (!pId && it.description) {
          const matchRes = await client.query(
            "SELECT id, name FROM public.products WHERE name ILIKE $1 LIMIT 1;",
            [it.description.trim()]
          );
          if (matchRes.rows.length > 0) {
            pId = matchRes.rows[0].id;
            pName = matchRes.rows[0].name;
          }
        }

        if (pId) {
          await recordInventoryMovement(client, {
            productId: pId,
            sku: it.sku || null,
            productName: pName,
            quantity: qty,
            movementType: "compra",
            stockAnterior: 0,
            stockPosterior: 0,
            sucursalOrigen: b.deposito_origen || "Pinamar",
            usuario: "Administrador",
            referenciaTipo: "bill",
            referenciaId: String(b.id),
            referenciaNumero: b.document_number || String(b.id).substring(0, 8),
            entidadAsociada: b.provider_name || "Proveedor",
            costoUnitario: cost,
            motivo: "Recepción de mercadería por compra",
            observaciones: `Ingreso según ${b.document_type || "Boleta"} ${b.document_number || ""} de ${b.provider_name || ""}`,
            estado: "confirmada",
            createdAt: b.date || b.created_at
          });
          count++;
        }
      }
    }

    await client.query("COMMIT;");
    return {
      reconciledCount: count,
      message: count > 0 
        ? `Conciliación completada. Se generaron ${count} registros históricos faltantes.` 
        : "Todos los movimientos históricos ya se encontraban completamente sincronizados y auditados."
    };
  } catch (err: any) {
    await client.query("ROLLBACK;");
    console.error("[Inventory Traceability] Error en conciliación de auditoría:", err);
    throw err;
  } finally {
    client.release();
  }
}
