/* SOLO LECTURA — todo lo que pasó hoy en requisiciones, con hora de Bogotá,
   para cruzarlo contra la hora en que se desplegó cada cambio. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();
  const filas = await ds.query(`
    SELECT to_char(l.created_at AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI') AS cuando,
           r.requisition_number, l.action, l.previous_status, l.new_status, u.nombre
      FROM requisition_logs l
      JOIN requisitions r ON r.requisition_id = l.requisition_id
      JOIN users u ON u.user_id = l.user_id
     WHERE l.created_at >= (CURRENT_DATE - INTERVAL '2 days')
     ORDER BY l.created_at
  `);
  console.log(`Eventos de requisiciones en los últimos 2 días: ${filas.length}\n`);
  for (const f of filas) {
    const aGerencia = f.new_status === "aprobada_revisor" ? "   <== dispara correo a Gerencia" : "";
    console.log(
      `  ${f.cuando}  ${String(f.requisition_number).padEnd(9)} ${String(f.action).padEnd(34)} ` +
        `${f.previous_status ?? "-"} -> ${f.new_status ?? "-"}  (${f.nombre})${aGerencia}`,
    );
  }
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
