/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Qué muestra la bandeja de aprobaciones una vez excluidos los datos de prueba.
 *
 * Reproduce las dos consultas que llevaban el filtro de más: requisiciones y
 * órdenes de compra. Antes de la fecha de corte todo es dato de prueba y no debe
 * aparecer en ninguna vista.
 */
const CORTE = "2026-01-07";

async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    logging: false,
    cache: false,
  });
  await ds.initialize();

  const rq = await ds.query(`
    SELECT r.requisition_number AS titulo,
           to_char(r.created_at, 'YYYY-MM-DD') AS fecha,
           (CURRENT_DATE - r.created_at::date) AS dias
      FROM requisitions r
      JOIN requisition_statuses rs ON rs.status_id = r.status_id
     WHERE rs.code IN ('pendiente', 'aprobada_revisor', 'autorizado')
       AND r.created_at >= TIMESTAMPTZ '${CORTE}'
     ORDER BY r.created_at ASC
  `);

  const oc = await ds.query(`
    SELECT po.purchase_order_number AS titulo,
           to_char(po.created_at, 'YYYY-MM-DD') AS fecha,
           (CURRENT_DATE - po.created_at::date) AS dias
      FROM purchase_orders po
      JOIN purchase_order_statuses st ON st.status_id = po.approval_status_id
     WHERE st.code = 'pendiente_aprobacion_gerencia'
       AND po.created_at >= TIMESTAMPTZ '${CORTE}'
     ORDER BY po.created_at ASC
  `);

  const pinta = (nombre: string, filas: any[]) => {
    console.log(`\n${nombre}: ${filas.length}`);
    for (const f of filas) {
      console.log(`  ${String(f.titulo).padEnd(14)} ${f.fecha}  ${f.dias} días`);
    }
  };

  pinta("Requisiciones", rq);
  pinta("Órdenes de compra", oc);
  console.log("");

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
