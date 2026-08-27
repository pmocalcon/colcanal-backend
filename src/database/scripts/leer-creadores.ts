import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Quiénes crearon las solicitudes de Jurídica. Solo lee. */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  console.log(JSON.stringify(await ds.query(
    `SELECT u.user_id, u.nombre, u.estado, r.nombre_rol
     FROM users u LEFT JOIN roles r ON r.rol_id = u.rol_id
     WHERE u.user_id IN (7, 12)`), null, 1));
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
