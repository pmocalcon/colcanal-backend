import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Qué gestiones y formatos hay en gc_solicitudes, y quién las creó. Solo lee. */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  console.log(JSON.stringify(await ds.query(
    `SELECT gestion, formato, count(*), count(DISTINCT created_by) AS creadores
     FROM gc_solicitudes GROUP BY 1, 2 ORDER BY 1, 2`), null, 1));
  console.log("SIN CREADOR:", JSON.stringify((await ds.query(
    `SELECT count(*) FROM gc_solicitudes WHERE created_by IS NULL`))[0]));
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
