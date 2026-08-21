/* SOLO LECTURA — separa las direcciones de alumbrados.co entre buzones
   funcionales (por cargo o municipio) y direcciones con nombre de persona. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();
  const users = await ds.query(`
    SELECT u.nombre, COALESCE(NULLIF(u.email_notificacion,''), u.email) AS usada, r.nombre_rol
      FROM users u LEFT JOIN roles r ON r.rol_id = u.rol_id
     WHERE u.estado = true
       AND lower(COALESCE(NULLIF(u.email_notificacion,''), u.email)) LIKE '%@alumbrados.co'
     ORDER BY length(COALESCE(NULLIF(u.email_notificacion,''), u.email)) DESC
  `);

  console.log(`Direcciones @alumbrados.co en uso: ${users.length}\n`);
  console.log("Ordenadas de la más larga a la más corta:\n");
  for (const u of users) {
    const local = u.usada.split("@")[0];
    const apellidos = (u.nombre || "").toLowerCase().split(/\s+/).filter(Boolean);
    // ¿El buzón contiene el nombre de la persona? Eso lo separa de un buzón de cargo.
    const esPersonal = apellidos.some((p: string) => p.length > 3 && local.toLowerCase().includes(p));
    console.log(
      `  ${String(local.length).padStart(2)}  ${local.padEnd(28)} ${esPersonal ? "<-- NOMBRE DE PERSONA" : ""}  (${u.nombre} · ${u.nombre_rol})`,
    );
  }
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
