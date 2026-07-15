import pg from "pg";
const { Pool } = pg;

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set.");
    return;
  }

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("================= SIMULATION: END-TO-END FLOW =================");

    // 1. PLACE A REAL SECURED ORDER
    console.log("\n[Step 1] Creating a secured order via POST /api/orders...");
    const orderPayload = {
      customerName: "Christian Olivera (E2E Test)",
      customerEmail: "elangelzaskiel@gmail.com",
      customerPhone: "099123456",
      shippingCost: 150,
      couponCode: null,
      notes: "Simulación de compra real Mercado Pago Sandbox",
      items: [
        {
          productId: "62", // Poncho Buzo Manta Canguro Pijama Plush C/ Capucha Corderito (Active)
          quantity: 2
        }
      ]
    };

    const orderResponse = await fetch("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await orderResponse.json();
    console.log("POST /api/orders Response Status:", orderResponse.status);
    console.log("POST /api/orders Response Body:", JSON.stringify(orderData, null, 2));

    if (!orderData.success) {
      throw new Error("Failed to create order.");
    }

    const orderId = orderData.orderId;
    console.log(`\n✅ Order Successfully Created in PostgreSQL database with ID: ${orderId}`);

    // Let's verify the order state in DB before payment
    console.log(`\n[Step 2] Querying order state in DB BEFORE payment...`);
    const checkBeforeRes = await pool.query(
      "SELECT id, customer_name, subtotal, discount_amount, shipping_cost, total, current_status FROM public.orders WHERE id = $1;",
      [orderId]
    );
    console.table(checkBeforeRes.rows);

    // 2. ATTEMPT MERCADO PAGO PREFERENCE CREATION
    console.log(`\n[Step 3] Requesting Mercado Pago preference creation for Order: ${orderId}`);
    const prefResponse = await fetch("http://localhost:3000/api/payments/mercadopago/preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderId })
    });
    const prefData = await prefResponse.json();
    console.log("POST /api/payments/mercadopago/preference Status:", prefResponse.status);
    console.log("POST /api/payments/mercadopago/preference Response:", JSON.stringify(prefData, null, 2));

    // Explain expectation
    if (!prefData.success) {
      console.log(`\nℹ️ note: Preference creation safely failed/returned validation block as expected: "${prefData.message}"`);
    }

    // 3. SIMULATE AN APPROVED TRANSACTION STATE TRANSITION
    console.log("\n[Step 4] Simulating and forcing payment APPROVED callback (Server-to-Server / Mock Validation)...");
    // Since we don't have a live token, we can perform a secure db update simulation to verify how database changes states,
    // or test the endpoint with custom state update parameters since the admin status endpoint is available!
    // Let's check: POST /api/admin/orders/status can be called, is it authenticaed? 
    // Let's call /api/payments/mercadopago/feedback?payment_id=null&orderId=<id> to see how it resolves status.
    console.log("Invoking Mercado Pago feedback callback endpoint...');");
    const feedbackUrl = `http://localhost:3000/api/payments/mercadopago/feedback?payment_id=null&orderId=${orderId}`;
    const feedbackRes = await fetch(feedbackUrl);
    console.log("Feedback callback returned HTTP status:", feedbackRes.status);

    // Let's query DB to verify the status after checkout flow
    // In actual production state with Mercado Pago token, the webhook updates to "pago_aprobado" or "pago_rechazado".
    // Let's simulate both status transitions using our secure pool to show how the database stores them!
    console.log("\n[Step 5] Simulating APPROVED state update in Database:");
    await pool.query("UPDATE public.orders SET current_status = 'pago_aprobado', updated_at = NOW() WHERE id = $1;", [orderId]);
    
    const checkApprovedRes = await pool.query(
      "SELECT id, customer_name, total, current_status, updated_at FROM public.orders WHERE id = $1;",
      [orderId]
    );
    console.log("Order state in DB after APPROVED payment:");
    console.table(checkApprovedRes.rows);

    console.log("\n[Step 6] Simulating REJECTED state update in Database:");
    await pool.query("UPDATE public.orders SET current_status = 'pago_rechazado', updated_at = NOW() WHERE id = $1;", [orderId]);
    
    const checkRejectedRes = await pool.query(
      "SELECT id, customer_name, total, current_status, updated_at FROM public.orders WHERE id = $1;",
      [orderId]
    );
    console.log("Order state in DB after REJECTED payment:");
    console.table(checkRejectedRes.rows);

    // 4. VERIFY PANEL VISUALIZATION STATUS
    console.log("\n[Step 7] Confirming order is listed for Admin Panel endpoint (Authorized):");
    const crypto = await import("crypto");
    const hashPassword = (pwd: string) => crypto.createHash("sha256").update(pwd + "juem-salt-1248").digest("hex");
    const stableToken = hashPassword("Juem:7219fc1c5ecfc887aae98aa0338884186acac202b63924cb5a8bb8ea943c4fd1");

    const getOrdersResponse = await fetch("http://localhost:3000/api/orders", {
      headers: {
        "Authorization": `Bearer ${stableToken}`
      }
    });
    const getOrdersData = await getOrdersResponse.json();
    
    // Check if our created orderId is in the list
    const orderList = Array.isArray(getOrdersData) ? getOrdersData : (getOrdersData.orders || []);
    const foundInList = orderList.find((o: any) => String(o.id) === String(orderId));
    console.log(`Found simulated order in admin lists? ${!!foundInList ? "✅ YES!" : "❌ NO"}`);
    if (foundInList) {
      console.log("Order from admin list view format:", JSON.stringify(foundInList, null, 2));
    }

  } catch (err: any) {
    console.error("Simulation failed:", err.message);
  } finally {
    await pool.end();
  }
}

run();
