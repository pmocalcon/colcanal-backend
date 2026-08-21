/* SOLO LECTURA — cuenta cotizaciones activas por ítem para ver dónde se pasaron
   del máximo de 2 proveedores. No escribe nada. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();

  const filas = await ds.query(`
    SELECT r.requisition_number,
           q.requisition_item_id                              AS item_id,
           COUNT(*) FILTER (WHERE q.is_active)                AS activas,
           COUNT(DISTINCT q.supplier_id) FILTER (WHERE q.is_active) AS proveedores,
           MAX(q.version)                                     AS version_max
      FROM requisition_item_quotations q
      JOIN requisition_items ri ON ri.item_id = q.requisition_item_id
      JOIN requisitions r       ON r.requisition_id = ri.requisition_id
     WHERE q.action = 'cotizar'
     GROUP BY r.requisition_number, q.requisition_item_id
    HAVING COUNT(*) FILTER (WHERE q.is_active) > 2
     ORDER BY activas DESC, r.requisition_number
     LIMIT 40
  `);

  console.log(`Ítems con MÁS de 2 cotizaciones activas: ${filas.length}`);
  for (const f of filas) {
    console.log(
      `  ${f.requisition_number.padEnd(10)} ítem ${String(f.item_id).padEnd(6)} ` +
        `activas=${f.activas}  proveedores distintos=${f.proveedores}  version=${f.version_max}`,
    );
  }

  const total = await ds.query(`
    SELECT COUNT(*)::int AS n FROM (
      SELECT q.requisition_item_id
        FROM requisition_item_quotations q
       WHERE q.action = 'cotizar'
       GROUP BY q.requisition_item_id
      HAVING COUNT(*) FILTER (WHERE q.is_active) > 2
    ) t
  `);
  console.log(`\nTotal de ítems afectados en toda la base: ${total[0].n}`);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
