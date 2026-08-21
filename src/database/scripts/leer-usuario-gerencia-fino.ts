/* SOLO LECTURA — compara al detalle los usuarios que reciben el correo de
   aprobación de requisiciones. Busca diferencias invisibles. No escribe nada. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  console.log("== Roles cuyo nombre parece 'Gerencia' ==");
  const roles = await ds.query(`
    SELECT rol_id, nombre_rol, length(nombre_rol) AS largo,
           encode(convert_to(nombre_rol,'UTF8'),'hex') AS hex,
           (trim(nombre_rol) = 'Gerencia') AS pasa_filtro_exacto
      FROM roles
     WHERE lower(trim(nombre_rol)) LIKE '%gerencia%'
     ORDER BY rol_id
  `);
  for (const r of roles) {
    console.log(
      `  rol_id=${String(r.rol_id).padEnd(3)} ${JSON.stringify(r.nombre_rol).padEnd(28)} largo=${r.largo} ` +
        `pasaFiltro=${r.pasa_filtro_exacto}\n      hex=${r.hex}`,
    );
  }

  console.log("\n== Usuarios que caen en ese filtro ==");
  const users = await ds.query(`
    SELECT u.user_id, u.nombre, u.rol_id, u.estado,
           u.email, u.email_notificacion,
           length(COALESCE(u.email_notificacion,'')) AS largo_notif,
           r.nombre_rol,
           (u.estado = true AND trim(r.nombre_rol) = 'Gerencia') AS recibiria
      FROM users u JOIN roles r ON r.rol_id = u.rol_id
     WHERE lower(trim(r.nombre_rol)) LIKE '%gerencia%'
     ORDER BY u.user_id
  `);
  for (const u of users) {
    console.log(
      `  #${String(u.user_id).padEnd(3)} ${(u.nombre||'').padEnd(20)} rol_id=${u.rol_id} ` +
        `estado=${u.estado} recibiriaAprobacion=${u.recibiria}`,
    );
    console.log(`        rol=${JSON.stringify(u.nombre_rol)}`);
    console.log(`        email      =${JSON.stringify(u.email)}`);
    console.log(`        emailNotif =${JSON.stringify(u.email_notificacion)} (largo ${u.largo_notif})`);
  }

  console.log("\n== ¿Hay usuarios duplicados con ese correo? ==");
  const dup = await ds.query(`
    SELECT lower(trim(COALESCE(NULLIF(email_notificacion,''), email))) AS dir,
           COUNT(*)::int AS n, array_agg(user_id ORDER BY user_id) AS ids,
           array_agg(estado ORDER BY user_id) AS estados
      FROM users
     GROUP BY 1 HAVING COUNT(*) > 1
     ORDER BY n DESC
  `);
  if (!dup.length) console.log("  ninguno");
  for (const d of dup) console.log(`  ${d.dir}  x${d.n}  ids=${d.ids}  estados=${d.estados}`);

  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
