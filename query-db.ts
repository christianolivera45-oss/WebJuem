import pg from 'pg';

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    const res = await pool.query("SELECT id, name, is_combo, combo_components, stock, stock_pinamar, stock_montevideo FROM public.products WHERE is_combo = true;");
    console.log("COMBO PRODUCTS:");
    console.log(JSON.stringify(res.rows, null, 2));

    for (const combo of res.rows) {
      const compIds = (combo.combo_components || []).map((c: any) => c.productId);
      if (compIds.length > 0) {
        const compRes = await pool.query("SELECT id, name, stock, stock_pinamar, stock_montevideo FROM public.products WHERE id = ANY($1::int[]);", [compIds.map(Number)]);
        console.log(`COMPONENTS FOR COMBO ${combo.id} (${combo.name}):`);
        console.log(JSON.stringify(compRes.rows, null, 2));
        
        const compVarRes = await pool.query("SELECT id, product_id, sku, size_value, color_name, stock, stock_pinamar, stock_montevideo FROM public.product_variants WHERE product_id = ANY($1::int[]);", [compIds.map(Number)]);
        console.log(`VARIANTS FOR COMPONENTS OF COMBO ${combo.id}:`);
        console.log(JSON.stringify(compVarRes.rows, null, 2));
      }
      const comboVarRes = await pool.query("SELECT id, product_id, sku, size_value, color_name, stock, stock_pinamar, stock_montevideo FROM public.product_variants WHERE product_id = $1;", [combo.id]);
      console.log(`VARIANTS FOR COMBO ${combo.id}:`);
      console.log(JSON.stringify(comboVarRes.rows, null, 2));
    }

  } catch (err) {
    console.error("Error querying db:", err);
  } finally {
    await pool.end();
  }
}

main();
