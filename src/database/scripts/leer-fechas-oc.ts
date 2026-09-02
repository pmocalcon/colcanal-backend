/* SOLO LECTURA — compara la fecha de emisión de cada OC contra la bitácora que la generó. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

const REQ = process.argv[2] ?? "PA-020";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  const ocs = await ds.query(`
    SELECT po.purchase_order_number AS oc,
           po.issue_date::text                                              AS issue_date,
           po.created_at AT TIME ZONE 'UTC'            AS creada_utc,
           to_char(po.created_at AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI') AS creada_bogota
      FROM purchase_orders po
      JOIN requisitions r ON r.requisition_id = po.requisition_id
     WHERE r.requisition_number = $1
     ORDER BY po.purchase_order_number
  `, [REQ]);

  console.log(`Órdenes de compra de ${REQ}\n`);
  console.log("OC              issue_date   creada (UTC)          creada (Bogotá)");
  for (const o of ocs) {
    const utc = new Date(o.creada_utc).toISOString().slice(0, 16).replace("T", " ");
    const marca = o.issue_date !== o.creada_bogota.slice(0, 10) ? "  <== no coincide" : "";
    console.log(`${o.oc.padEnd(15)} ${o.issue_date}   ${utc}      ${o.creada_bogota}${marca}`);
  }

  const logs = await ds.query(`
    SELECT l.action,
           to_char(l.created_at AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI')            AS utc,
           to_char(l.created_at AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI') AS bogota
      FROM requisition_logs l
      JOIN requisitions r ON r.requisition_id = l.requisition_id
     WHERE r.requisition_number = $1
       AND l.action IN ('asignar_precios','generar_ordenes_compra','aprobar_orden_compra')
     ORDER BY l.created_at
  `, [REQ]);

  console.log(`\nBitácora relacionada con las órdenes\n`);
  console.log("acción                       UTC                Bogotá");
  for (const l of logs) console.log(`${l.action.padEnd(28)} ${l.utc}   ${l.bogota}`);

  await ds.destroy();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
