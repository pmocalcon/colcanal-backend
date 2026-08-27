import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Busca a Franco Romero y a Yamileth Osorio entre los usuarios. Solo lee. */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  const usuarios = await ds.query(
    `SELECT u.user_id, u.nombre, u.cargo, u.email, u.email_notificacion, u.estado, r.nombre_rol
     FROM users u LEFT JOIN roles r ON r.rol_id = u.rol_id
     WHERE lower(u.nombre) LIKE '%franco%' OR lower(u.nombre) LIKE '%romero%'
        OR lower(u.nombre) LIKE '%yamil%' OR lower(u.nombre) LIKE '%osorio%'
        OR r.nombre_rol = 'Coordinador Financiero'
     ORDER BY u.nombre`,
  );
  console.log("COINCIDENCIAS:", JSON.stringify(usuarios, null, 1));
  const roles = await ds.query(`SELECT rol_id, nombre_rol FROM roles ORDER BY nombre_rol`);
  console.log("ROLES:", JSON.stringify(roles.map((r: any) => r.nombre_rol)));
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
