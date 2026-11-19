import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

const ADMIN_USER = process.env.TEST_ADMIN_USER || "uriel";
const ADMIN_PASS = process.env.TEST_ADMIN_PASS || "#Uriel2049";

const CONFIDENTIAL_FIELDS = [
  "precioCompra",
  "precioCon40",
  "comisionML",
  "comisionMP",
  "precioVentaML",
  "stockPinamar",
  "stockMontevideo",
  "calcWebPriceFromML"
];

async function httpJson(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, headers: res.headers, data };
}

async function runTests() {
  const results = [];
  const record = (name, ok, details) => {
    results.push({ name, ok, details });
    const icon = ok ? "✅" : "❌";
    console.log(`${icon} ${name}: ${details}`);
    if (!ok) {
      throw new Error(`Fallo en prueba [${name}]: ${details}`);
    }
  };

  console.log(`\n🔐 Iniciando suite de pruebas de seguridad e integridad en ${BASE_URL}...\n`);

  // Autenticación administrativa inicial para preparar baseline de verificación
  const initialLogin = await httpJson("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
  });
  assert.equal(initialLogin.status, 200, "Login admin inicial falló");
  assert.equal(initialLogin.data?.success, true, "Login admin no devolvió success=true");
  const adminToken = initialLogin.data.token;
  assert.ok(adminToken, "No se recibió token administrativo");

  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  // Capturar snapshot baseline previo a cualquier prueba para garantizar reversión limpia al 100%
  const baselineRes = await httpJson("/api/store", { headers: authHeaders });
  assert.equal(baselineRes.status, 200);
  assert.equal(baselineRes.data?.isAdminScope, true, "GET /api/store autenticado debe indicar isAdminScope=true");
  const baselineProducts = JSON.parse(JSON.stringify(baselineRes.data.products || []));
  assert.ok(baselineProducts.length >= 50, `Se esperaban >= 50 productos, hay ${baselineProducts.length}`);

  // Elegir un producto con costo, comisión, precioVentaML y precioWeb > 0 para probar sobre un caso real y luego restaurarlo
  const targetProd =
    baselineProducts.find(
      (p) =>
        Number(p.precioCompra || 0) > 0 &&
        Number(p.precioCon40 || 0) > 0 &&
        Number(p.comisionML || 0) > 0 &&
        Number(p.precioVentaML || 0) > 0 &&
        Number(p.precioWeb || 0) > 0 &&
        (!p.variants || p.variants.length === 0)
    ) ||
    baselineProducts.find(
      (p) =>
        Number(p.precioCompra || 0) > 0 &&
        Number(p.precioVentaML || 0) > 0 &&
        Number(p.precioWeb || 0) > 0
    );
  assert.ok(targetProd, "No se encontró un producto con datos financieros completos para probar");

  const preTestBackupRes = await httpJson("/api/admin/backups", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ reason: "Respaldo previo a suite de pruebas automáticas" })
  });
  assert.equal(preTestBackupRes.status, 200);
  const preTestBackupId = preTestBackupRes.data.backup.id;
  assert.equal(preTestBackupRes.data.verification?.valid, true, "El respaldo pre-test debe pasar validación SHA-256");

  try {
    // =========================================================================
    // ESCENARIO 1: Un visitante ingresa a la web sin iniciar sesión
    // =========================================================================
    const pubStore = await httpJson("/api/store");
    assert.equal(pubStore.status, 200);
    assert.equal(pubStore.data?.isAdminScope, undefined, "El payload público no debe incluir isAdminScope");
    assert.equal(pubStore.data?.adminCredentials, undefined, "El payload público no debe exponer adminCredentials");
    assert.equal(pubStore.data?.orders, undefined, "El payload público no debe exponer orders");
    assert.equal(pubStore.data?.bills, undefined, "El payload público no debe exponer bills");
    const pubProducts = pubStore.data?.products || [];
    assert.ok(pubProducts.length > 0, "El catálogo público debe devolver productos activos");

    for (const pp of pubProducts) {
      for (const cf of CONFIDENTIAL_FIELDS) {
        assert.equal(pp[cf], undefined, `Campo confidencial '${cf}' filtrado en catálogo público para producto ${pp.id}`);
      }
      for (const pv of pp.variants || []) {
        assert.equal(pv.stockPinamar, undefined, `Variante ${pv.id} filtró stockPinamar al público`);
        assert.equal(pv.stockMontevideo, undefined, `Variante ${pv.id} filtró stockMontevideo al público`);
      }
    }

    const htmlRes = await fetch(`${BASE_URL}/`);
    assert.equal(htmlRes.status, 200);
    const htmlText = await htmlRes.text();
    assert.equal(htmlText.includes("precioCompra"), false, "El HTML público SSR no debe contener precioCompra");
    assert.equal(htmlText.includes("comisionML"), false, "El HTML público SSR no debe contener comisionML");

    record(
      "Escenario 1 — Visitante anónimo",
      true,
      `Catálogo público (${pubProducts.length} items) y HTML SSR sin fuga de costos, comisiones, márgenes ni stock por sucursal.`
    );

    // =========================================================================
    // ESCENARIO 2: Administrador inicia sesión después de visitas públicas
    // =========================================================================
    await httpJson("/api/store?scope=public");
    await httpJson("/api/store");
    const login2 = await httpJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
    });
    assert.equal(login2.status, 200);
    const adminStoreAfterPub = await httpJson("/api/store", {
      headers: { Authorization: `Bearer ${login2.data.token}` }
    });
    assert.equal(adminStoreAfterPub.status, 200);
    assert.equal(adminStoreAfterPub.data.stateVersion, baselineRes.data.stateVersion, "Visitas públicas + login admin alteraron stateVersion");
    const prodAfterPub = adminStoreAfterPub.data.products.find((p) => String(p.id) === String(targetProd.id));
    assert.equal(Number(prodAfterPub.precioCompra), Number(targetProd.precioCompra));
    assert.equal(Number(prodAfterPub.comisionML), Number(targetProd.comisionML));
    assert.equal(Number(prodAfterPub.precioVentaML), Number(targetProd.precioVentaML));
    record(
      "Escenario 2 — Login admin tras visitas públicas",
      true,
      `Checksum idéntico (${adminStoreAfterPub.data.stateVersion}) tras visitas públicas y nuevo login.`
    );

    // =========================================================================
    // ESCENARIO 3: Administrador actualiza un producto correctamente
    // =========================================================================
    const patchNoteName = `${targetProd.name}`;
    const nextPriceTest = Number(targetProd.precioWeb) + 5;
    const upd3 = await httpJson(`/api/products/${targetProd.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        expectedUpdatedAt: prodAfterPub.updatedAt,
        updates: {
          name: patchNoteName,
          precioWeb: nextPriceTest,
          price: nextPriceTest
        }
      })
    });
    assert.equal(upd3.status, 200, `Actualización admin falló: ${JSON.stringify(upd3.data)}`);
    assert.equal(Number(upd3.data.product.precioWeb), nextPriceTest);
    assert.equal(Number(upd3.data.product.precioCompra), Number(targetProd.precioCompra));
    assert.equal(Number(upd3.data.product.comisionML), Number(targetProd.comisionML));
    assert.equal(Number(upd3.data.product.precioVentaML), Number(targetProd.precioVentaML));

    const logs3 = await httpJson(`/api/admin/audit-logs?productId=${targetProd.id}&limit=10`, { headers: authHeaders });
    assert.equal(logs3.status, 200);
    assert.ok(
      logs3.data.logs.some((l) => l.fieldName === "precioWeb" && Number(l.newValue) === nextPriceTest),
      "Debe registrarse cambio en audit-logs"
    );
    record(
      "Escenario 3 — Actualización admin persistida y auditada",
      true,
      `Producto ${targetProd.codigo} actualizado y persistido en PostgreSQL + registrado en product_audit_logs.`
    );

    // =========================================================================
    // ESCENARIO 4: Modificación exclusiva de precioWeb
    // =========================================================================
    const latestFor4 = upd3.data.product;
    const onlyWebPrice = Number(targetProd.precioWeb) + 10;
    const upd4 = await httpJson(`/api/products/${targetProd.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        expectedUpdatedAt: latestFor4.updatedAt,
        updates: {
          precioWeb: onlyWebPrice,
          price: onlyWebPrice
        }
      })
    });
    assert.equal(upd4.status, 200);
    const p4 = upd4.data.product;
    assert.equal(Number(p4.precioWeb), onlyWebPrice);
    assert.equal(Number(p4.precioCompra), Number(targetProd.precioCompra));
    assert.equal(Number(p4.precioCon40), Number(targetProd.precioCon40));
    assert.equal(Number(p4.comisionML), Number(targetProd.comisionML));
    assert.equal(Number(p4.comisionMP), Number(targetProd.comisionMP));
    assert.equal(Number(p4.precioVentaML), Number(targetProd.precioVentaML));
    assert.equal(Number(p4.stock), Number(targetProd.stock));
    record(
      "Escenario 4 — Modificación exclusiva de precioWeb",
      true,
      `Solo cambió precioWeb/price (${onlyWebPrice}); costos, comisiones ML/MP y stock permanecieron intactos.`
    );

    // =========================================================================
    // ESCENARIO 5: Modificación exclusiva de stock
    // =========================================================================
    const latestFor5 = upd4.data.product;
    let stockPatch;
    let expectedStockAfter5;
    if (Array.isArray(latestFor5.variants) && latestFor5.variants.length > 0) {
      const clonedVars = JSON.parse(JSON.stringify(latestFor5.variants));
      clonedVars[0].stockPinamar = Number(clonedVars[0].stockPinamar || 0) + 1;
      clonedVars[0].stock = Number(clonedVars[0].stockPinamar || 0) + Number(clonedVars[0].stockMontevideo || 0);
      stockPatch = { variants: clonedVars };
      expectedStockAfter5 = clonedVars.reduce((s, v) => s + Number(v.stock || 0), 0);
    } else {
      const nextPin = Number(latestFor5.stockPinamar || 0) + 1;
      const nextStockTotal = Number(latestFor5.stock || 0) + 1;
      stockPatch = { stockPinamar: nextPin, stock: nextStockTotal };
      expectedStockAfter5 = nextStockTotal;
    }

    const upd5 = await httpJson(`/api/products/${targetProd.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        expectedUpdatedAt: latestFor5.updatedAt,
        updates: stockPatch
      })
    });
    assert.equal(upd5.status, 200);
    const p5 = upd5.data.product;
    assert.equal(Number(p5.stock), expectedStockAfter5);
    assert.equal(Number(p5.precioCompra), Number(targetProd.precioCompra));
    assert.equal(Number(p5.comisionML), Number(targetProd.comisionML));
    assert.equal(Number(p5.precioVentaML), Number(targetProd.precioVentaML));
    assert.equal(Number(p5.precioWeb), onlyWebPrice);
    record(
      "Escenario 5 — Modificación exclusiva de stock",
      true,
      `Stock actualizado (${expectedStockAfter5}) sin alterar costos, comisiones ni precios.`
    );

    // =========================================================================
    // ESCENARIO 6: Guardado con campos ausentes/undefined/null y ceros accidentales
    // =========================================================================
    const upd6 = await httpJson(`/api/products/${targetProd.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        expectedUpdatedAt: p5.updatedAt,
        updates: {
          name: p5.name,
          precioCompra: 0,
          precioCon40: null,
          comisionML: undefined,
          precioVentaML: 0
        }
      })
    });
    assert.equal(upd6.status, 200);
    const p6 = upd6.data.product;
    assert.equal(Number(p6.precioCompra), Number(targetProd.precioCompra), "precioCompra=0 accidental debía ser bloqueado");
    assert.equal(Number(p6.precioCon40), Number(targetProd.precioCon40), "precioCon40=null debía preservar valor");
    assert.equal(Number(p6.comisionML), Number(targetProd.comisionML), "comisionML=undefined debía preservar valor");
    assert.equal(Number(p6.precioVentaML), Number(targetProd.precioVentaML), "precioVentaML=0 accidental debía ser bloqueado");
    assert.ok((upd6.data.blockedZeros || []).length >= 2, "Debe reportar campos bloqueados en blockedZeros");
    record(
      "Escenario 6 — Campos ausentes, null y ceros accidentales bloqueados",
      true,
      `Se preservaron todos los campos financieros y se bloquearon ${(upd6.data.blockedZeros || []).length} sobrescrituras accidentales a $0 con alerta.`
    );

    // =========================================================================
    // ESCENARIO 7: Guardado desde caché desactualizada (409 Conflict)
    // =========================================================================
    const stalePatchRes = await httpJson(`/api/products/${targetProd.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        expectedUpdatedAt: prodAfterPub.updatedAt,
        updates: { precioWeb: 1 }
      })
    });
    assert.equal(stalePatchRes.status, 409, `Se esperaba 409 por updatedAt obsoleto, llegó ${stalePatchRes.status}`);

    const staleStoreRes = await httpJson("/api/store", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        expectedStateVersion: baselineRes.data.stateVersion,
        products: baselineProducts,
        categories: baselineRes.data.categories,
        settings: baselineRes.data.settings
      })
    });
    assert.equal(staleStoreRes.status, 409, `Se esperaba 409 por stateVersion obsoleta, llegó ${staleStoreRes.status}`);
    record(
      "Escenario 7 — Rechazo de caché desactualizada (409 Conflict)",
      true,
      "Tanto PATCH /api/products/:id como POST /api/store rechazaron cachés obsoletas con HTTP 409 sin sobrescribir datos."
    );

    // =========================================================================
    // ESCENARIO 8: Dos modificaciones simultáneas sobre el mismo producto
    // =========================================================================
    const sharedUpdatedAt = p6.updatedAt;
    const [simA, simB] = await Promise.all([
      httpJson(`/api/products/${targetProd.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          expectedUpdatedAt: sharedUpdatedAt,
          updates: { precioWeb: Number(targetProd.precioWeb) + 25, price: Number(targetProd.precioWeb) + 25 }
        })
      }),
      httpJson(`/api/products/${targetProd.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          expectedUpdatedAt: sharedUpdatedAt,
          updates: { precioWeb: Number(targetProd.precioWeb) + 50, price: Number(targetProd.precioWeb) + 50 }
        })
      })
    ]);
    const statuses8 = [simA.status, simB.status].sort((a, b) => a - b);
    assert.deepEqual(statuses8, [200, 409], `Se esperaba exactamente [200, 409] ante edición simultánea, se recibió ${JSON.stringify(statuses8)}`);
    const afterSim = await httpJson("/api/store", { headers: authHeaders });
    const p8 = afterSim.data.products.find((p) => String(p.id) === String(targetProd.id));
    assert.equal(Number(p8.precioCompra), Number(targetProd.precioCompra), "Concurrencia no debe afectar precioCompra");
    record(
      "Escenario 8 — Dos modificaciones simultáneas",
      true,
      `Una petición completó (200) y la segunda fue bloqueada con conflicto (409) sin sobrescribir la primera; valores críticos intactos.`
    );

    // =========================================================================
    // ESCENARIO 9: Intento de modificación sin autorización
    // =========================================================================
    const unauthPatch = await httpJson(`/api/products/${targetProd.id}`, {
      method: "PATCH",
      body: JSON.stringify({ updates: { precioCompra: 0, stock: 999 } })
    });
    const unauthPost = await httpJson("/api/store", {
      method: "POST",
      headers: { Authorization: "Bearer invalid-token-test" },
      body: JSON.stringify({ products: [], categories: [], settings: {} })
    });
    const unauthStock = await httpJson("/api/stock/adjust", {
      method: "POST",
      body: JSON.stringify({ productId: targetProd.id, field: "stockPinamar", value: 0 })
    });
    const unauthBackup = await httpJson(`/api/admin/backups/${preTestBackupId}/restore-product`, {
      method: "POST",
      body: JSON.stringify({ productId: targetProd.id })
    });
    assert.equal(unauthPatch.status, 403);
    assert.equal(unauthPost.status, 403);
    assert.equal(unauthStock.status, 403);
    assert.equal(unauthBackup.status, 403);

    const alertsRes = await httpJson("/api/admin/alerts", { headers: authHeaders });
    assert.equal(alertsRes.status, 200);
    assert.ok(
      (alertsRes.data.alerts || []).some((a) => a.alertType === "unauthorized_attempt"),
      "Debe existir alerta unauthorized_attempt registrada"
    );
    record(
      "Escenario 9 — Bloqueo de modificaciones sin autorización",
      true,
      "Todos los endpoints protegidos devolvieron HTTP 403 y registraron alerta de intento no autorizado."
    );

    // =========================================================================
    // ESCENARIO 10: Respaldo diario, verificación SHA-256, escaneo anomalías y restauración individual
    // =========================================================================
    const listBkpRes = await httpJson("/api/admin/backups", { headers: authHeaders });
    assert.equal(listBkpRes.status, 200);
    assert.ok((listBkpRes.data.backups || []).some((b) => b.backupType === "daily"), "Debe existir respaldo automático diario");

    const verifyRes = await httpJson(`/api/admin/backups/${preTestBackupId}/verify`, {
      method: "POST",
      headers: authHeaders
    });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.data.valid, true);
    assert.equal(verifyRes.data.checksumMatch, true);

    const restoreRes = await httpJson(`/api/admin/backups/${preTestBackupId}/restore-product`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        productId: targetProd.id,
        fields: ["name", "price", "precioWeb", "stock", "stockPinamar", "stockMontevideo", "variants"]
      })
    });
    assert.equal(restoreRes.status, 200, `Restauración individual falló: ${JSON.stringify(restoreRes.data)}`);
    assert.ok(restoreRes.data.preRestoreBackupId, "Debe generarse respaldo pre_restore automático");

    // Verificar que los 53 productos quedaron idénticos al estado previo a las pruebas
    const postRestoreStore = await httpJson("/api/store", { headers: authHeaders });
    const postProducts = postRestoreStore.data.products || [];
    assert.equal(postProducts.length, baselineProducts.length, "La cantidad total de productos debe coincidir");
    const restoredTarget = postProducts.find((p) => String(p.id) === String(targetProd.id));
    assert.equal(Number(restoredTarget.precioWeb), Number(targetProd.precioWeb));
    assert.equal(Number(restoredTarget.price), Number(targetProd.price));
    assert.equal(Number(restoredTarget.stock), Number(targetProd.stock));
    assert.equal(Number(restoredTarget.precioCompra), Number(targetProd.precioCompra));

    for (const orig of baselineProducts) {
      const cur = postProducts.find((p) => String(p.id) === String(orig.id));
      assert.ok(cur, `Falta producto ${orig.id} tras restauración`);
      assert.equal(Number(cur.precioCompra || 0), Number(orig.precioCompra || 0), `Drift en precioCompra ${orig.codigo}`);
      assert.equal(Number(cur.precioVentaML || 0), Number(orig.precioVentaML || 0), `Drift en precioVentaML ${orig.codigo}`);
      assert.equal(Number(cur.precioWeb || 0), Number(orig.precioWeb || 0), `Drift en precioWeb ${orig.codigo}`);
      assert.equal(Number(cur.stock || 0), Number(orig.stock || 0), `Drift en stock ${orig.codigo}`);
    }

    const scanRes = await httpJson("/api/admin/anomalies/scan", {
      method: "POST",
      headers: authHeaders
    });
    assert.equal(scanRes.status, 200);
    assert.equal(scanRes.data.autoRestored, false, "El detector de anomalías no debe auto-restaurar");
    assert.equal((scanRes.data.anomalies || []).length, 0, "No deben quedar anomalías tras restaurar producto de prueba");

    record(
      "Escenario 10 — Respaldos, verificación SHA-256, escaneo sin auto-restore y recuperación individual",
      true,
      `Producto ${targetProd.codigo} restaurado desde ${preTestBackupId} (con respaldo previo ${restoreRes.data.preRestoreBackupId}); los ${postProducts.length} productos coinciden 100% con el baseline.`
    );

    console.log(`\n🎉 TODAS LAS PRUEBAS (${results.length}/${results.length}) PASARON CON ÉXITO.\n`);
  } catch (err) {
    // Asegurar restauración de seguridad en caso de fallo intermedio
    await httpJson(`/api/admin/backups/${preTestBackupId}/restore-product`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ productId: targetProd.id })
    }).catch(() => {});
    throw err;
  }
}

runTests().catch((err) => {
  console.error("\n❌ Error en suite de pruebas:", err);
  process.exit(1);
});
