/* SOLO LECTURA — datos de contacto de Gerencia y últimas requisiciones que
   quedaron esperando su firma. No escribe nada. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  console.log("== Usuarios con rol Gerencia ==");
  const users = await ds.query(`
    SELECT u.user_id, u.nombre, u.email, u.email_notificacion, u.estado, r.nombre_rol
      FROM users u JOIN roles r ON r.rol_id = u.rol_id
     WHERE lower(r.nombre_rol) = 'gerencia'
     ORDER BY u.user_id
  `);
  for (const u of users) {
    console.log(
      `  #${u.user_id} ${u.nombre} | rol=${u.nombre_rol} | activo=${u.estado}\n` +
        `      email=${u.email}\n      email_notificacion=${u.email_notificacion ?? "(vacío)"}`,
    );
  }

  console.log("\n== Últimas requisiciones que pasaron a esperar Gerencia ==");
  const logs = await ds.query(`
    SELECT r.requisition_number, l.action, l.previous_status, l.new_status,
           to_char(l.created_at AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI') AS cuando,
           u.nombre AS quien,
           rs.code AS estado_actual
      FROM requisition_logs l
      JOIN requisitions r ON r.requisition_id = l.requisition_id
      JOIN users u        ON u.user_id = l.user_id
      LEFT JOIN requisition_statuses rs ON rs.status_id = r.status_id
     WHERE l.new_status = 'aprobada_revisor'
     ORDER BY l.created_at DESC
     LIMIT 12
  `);
  for (const l of logs) {
    console.log(
      `  ${l.cuando}  ${l.requisition_number.padEnd(10)} ${l.action.padEnd(22)} ` +
        `${l.previous_status} -> ${l.new_status}  por ${l.quien}  [hoy: ${l.estado_actual}]`,
    );
  }

  console.log("\n== Requisiciones AHORA esperando firma de Gerencia ==");
  const pend = await ds.query(`
    SELECT r.requisition_number,
           to_char(r.updated_at AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI') AS actualizada,
           rs.code
      FROM requisitions r
      JOIN requisition_statuses rs ON rs.status_id = r.status_id
     WHERE rs.code = 'aprobada_revisor'
     ORDER BY r.updated_at DESC
  `);
  console.log(`  ${pend.length} requisición(es)`);
  for (const p of pend) console.log(`    ${p.requisition_number}  ${p.actualizada}`);

  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
