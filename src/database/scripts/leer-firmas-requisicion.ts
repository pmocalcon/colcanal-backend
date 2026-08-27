/* SOLO LECTURA: qué firmas tiene una requisición y cómo se comparan con las demás. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const numero = process.argv[2] ?? "C&C-087";
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();

  console.log(`=== ${numero}: la requisición ===`);
  const [req] = await ds.query(
    `SELECT r.requisition_id, r.requisition_number, s.name AS estado,
            cr.nombre AS creador, rc.nombre_rol AS rol_creador,
            rv.nombre AS revisor, rvr.nombre_rol AS rol_revisor, r.reviewed_at,
            ap.nombre AS aprobador, apr.nombre_rol AS rol_aprobador, r.approved_at
     FROM requisitions r
     LEFT JOIN requisition_statuses s ON s.status_id = r.status_id
     LEFT JOIN users cr ON cr.user_id = r.created_by
     LEFT JOIN roles rc ON rc.rol_id = cr.rol_id
     LEFT JOIN users rv ON rv.user_id = r.reviewed_by
     LEFT JOIN roles rvr ON rvr.rol_id = rv.rol_id
     LEFT JOIN users ap ON ap.user_id = r.approved_by
     LEFT JOIN roles apr ON apr.rol_id = ap.rol_id
     WHERE r.requisition_number = $1`,
    [numero],
  );
  if (!req) {
    console.log("No existe esa requisición.");
    await ds.destroy();
    return;
  }
  console.table([req]);

  console.log("=== sus firmas ===");
  console.table(
    await ds.query(
      `SELECT a.step_order, a.action, u.nombre AS quien, ro.nombre_rol AS rol,
              a.previous_status_id AS de, a.new_status_id AS a, a.comments, a.created_at
       FROM requisition_approvals a
       LEFT JOIN users u ON u.user_id = a.user_id
       LEFT JOIN roles ro ON ro.rol_id = u.rol_id
       WHERE a.requisition_id = $1 ORDER BY a.approval_id`,
      [req.requisition_id],
    ),
  );

  console.log("=== cuántas firmas llevan las demás requisiciones aprobadas por gerencia ===");
  console.table(
    await ds.query(
      `SELECT firmas, count(*)::int AS requisiciones,
              string_agg(requisition_number, ', ' ORDER BY requisition_number) AS cuales
       FROM (
         SELECT r.requisition_number, count(a.approval_id)::int AS firmas
         FROM requisitions r
         LEFT JOIN requisition_approvals a ON a.requisition_id = r.requisition_id
         WHERE r.status_id = 6
         GROUP BY r.requisition_number
       ) t GROUP BY firmas ORDER BY firmas`,
    ),
  );

  console.log("=== los pasos que usan las demás (quién firma en cada step_order) ===");
  console.table(
    await ds.query(
      `SELECT a.step_order, ro.nombre_rol AS rol, count(*)::int AS veces
       FROM requisition_approvals a
       LEFT JOIN users u ON u.user_id = a.user_id
       LEFT JOIN roles ro ON ro.rol_id = u.rol_id
       GROUP BY a.step_order, ro.nombre_rol ORDER BY a.step_order, veces DESC`,
    ),
  );

  console.log("=== estados por los que pasó, según su historial ===");
  console.table(
    await ds.query(
      `SELECT l.action, u.nombre AS quien, ro.nombre_rol AS rol, l.created_at
       FROM requisition_logs l
       LEFT JOIN users u ON u.user_id = l.user_id
       LEFT JOIN roles ro ON ro.rol_id = u.rol_id
       WHERE l.requisition_id = $1 ORDER BY l.log_id`,
      [req.requisition_id],
    ),
  );

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
