/* SOLO LECTURA — reloj del servidor de base de datos y últimos eventos reales. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  const t = await ds.query(`
    SELECT now() AS ahora_tz,
           current_date AS hoy,
           current_setting('TimeZone') AS zona,
           to_char(now() AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI') AS ahora_bogota
  `);
  console.log("Reloj de la base:");
  console.log("  now()        =", t[0].ahora_tz);
  console.log("  current_date =", t[0].hoy);
  console.log("  TimeZone     =", t[0].zona);
  console.log("  en Bogotá    =", t[0].ahora_bogota);
  console.log("  reloj local  =", new Date().toISOString(), "(máquina)");

  const m = await ds.query(`
    SELECT to_char(max(created_at) AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI') AS ultimo,
           count(*)::int AS total
      FROM requisition_logs
  `);
  console.log(`\nrequisition_logs: ${m[0].total} filas, la última ${m[0].ultimo} (Bogotá)`);

  const u = await ds.query(`
    SELECT to_char(l.created_at AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI') AS cuando,
           r.requisition_number, l.action, l.new_status, us.nombre
      FROM requisition_logs l
      JOIN requisitions r ON r.requisition_id = l.requisition_id
      JOIN users us ON us.user_id = l.user_id
     ORDER BY l.created_at DESC LIMIT 10
  `);
  console.log("\nÚltimos 10 eventos:");
  for (const f of u) {
    console.log(`  ${f.cuando}  ${String(f.requisition_number).padEnd(9)} ${String(f.action).padEnd(34)} -> ${f.new_status} (${f.nombre})`);
  }
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
