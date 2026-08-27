import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Quiénes están activos y todavía no tienen cuenta cargada. Solo lee. */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  const filas = await ds.query(
    `SELECT nombre, identificacion, empresa_proyecto
     FROM th_personal
     WHERE estado ILIKE 'ACTIVO%' AND (cuenta IS NULL OR cuenta = '')
     ORDER BY nombre`,
  );
  console.log(filas.length, "activos sin cuenta");
  for (const f of filas) console.log(` - ${f.nombre} (${f.identificacion}) · ${f.empresa_proyecto}`);
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
