import pg from "pg";
const { Pool } = pg;

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Error: DATABASE_URL not set in environment.");
    return;
  }

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("=============== SUPABASE PostgreSQL RLS AUDIT ===============");
    
    // Query list of tables and whether RLS is enabled for each
    const tableQuery = `
      SELECT 
        schemaname, 
        tablename, 
        rowsecurity as rls_enabled
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    const tableRes = await pool.query(tableQuery);
    console.log("\nTable List and RLS status:");
    console.table(tableRes.rows);

    // Query active policies
    const policyQuery = `
      SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive, 
        roles, 
        cmd, 
        qual, 
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public';
    `;
    const policyRes = await pool.query(policyQuery);
    console.log("\nConfigured Row-Level Security (RLS) Policies:");
    if (policyRes.rows.length === 0) {
      console.log("No specific RLS policies found.");
    } else {
      console.table(policyRes.rows);
    }

    console.log("\n=============== REAL DATA ORDERS RETRIEVAL ===============");
    const ordersQuery = `
      SELECT id, customer_name, customer_email, subtotal, discount_amount, total, current_status, created_at 
      FROM public.orders 
      ORDER BY created_at DESC 
      LIMIT 10;
    `;
    const ordersRes = await pool.query(ordersQuery);
    console.log(`\nMost recent orders in DB (Found: ${ordersRes.rows.length}):`);
    if (ordersRes.rows.length === 0) {
      console.log("No orders found in public.orders table.");
    } else {
      console.table(ordersRes.rows);
    }

  } catch (err: any) {
    console.error("Database connection or query failed:", err.message);
  } finally {
    await pool.end();
  }
}

run();
