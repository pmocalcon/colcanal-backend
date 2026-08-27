import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Vuelca cómo vienen escritos los nombres y qué proyectos hay. Solo lee. */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  const filas = await ds.query(
    `SELECT persona_id, identificacion, nombre, estado, empresa_proyecto, banco, cuenta, tipo_cuenta
     FROM th_personal ORDER BY nombre LIMIT 15`,
  );
  console.log("===MUESTRA===");
  console.log(JSON.stringify(filas, null, 1));
  const proy = await ds.query(
    `SELECT empresa_proyecto, count(*) FROM th_personal GROUP BY 1 ORDER BY 2 DESC`,
  );
  console.log("===PROYECTOS===");
  console.log(JSON.stringify(proy));
  const per = await ds.query(`SELECT periodo, count(*) FROM th_nomina_liquidaciones GROUP BY 1 ORDER BY 1`);
  console.log("===PERIODOS-LIQUIDADOS===");
  console.log(JSON.stringify(per));
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
