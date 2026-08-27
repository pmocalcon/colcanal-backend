import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Qué años tienen parámetros cargados y qué periodos tienen novedades. Solo lee. */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  console.log("PARAMETROS", JSON.stringify(await ds.query(
    `SELECT anio, smmlv, auxilio_transporte FROM th_parametros_nomina ORDER BY anio`)));
  console.log("NOVEDADES", JSON.stringify(await ds.query(
    `SELECT periodo, count(*) FROM th_novedades_nomina GROUP BY 1 ORDER BY 1`)));
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
