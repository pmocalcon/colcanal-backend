import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Cómo van los ids de gc_solicitudes y qué se los comió. Solo lee. */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  console.log("FILAS:", JSON.stringify(await ds.query(
    `SELECT solicitud_id, gestion, formato, estado, created_by, created_at
     FROM gc_solicitudes ORDER BY solicitud_id`), null, 1));
  console.log("MAX/COUNT:", JSON.stringify((await ds.query(
    `SELECT max(solicitud_id) AS maximo, count(*) AS filas FROM gc_solicitudes`))[0]));
  console.log("COLUMNAS:", JSON.stringify((await ds.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='gc_solicitudes'`))
    .map((c: any) => c.column_name)));
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
