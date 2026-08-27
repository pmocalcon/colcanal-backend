/* SOLO LECTURA */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();
  console.log("=== columnas de th_personal ===");
  console.table(await ds.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'th_personal' ORDER BY 1`));
  console.log("=== tipos de contrato ===");
  console.table(await ds.query(`
    SELECT coalesce(nullif(btrim(tipo_contrato), ''), '(vacío)') AS tipo_contrato,
           count(*)::int AS personas,
           count(*) FILTER (WHERE upper(coalesce(estado,'')) LIKE 'ACTIVO%')::int AS activas,
           round(sum(coalesce(salario,0))/1000000.0, 1) AS salarios_millones
    FROM th_personal GROUP BY 1 ORDER BY 2 DESC`));
  console.log("=== quiénes son los de prestación de servicios ===");
  console.table(await ds.query(`
    SELECT persona_id, identificacion, nombre, cargo, empresa_proyecto, estado, tipo_contrato, salario
    FROM th_personal
    WHERE upper(coalesce(tipo_contrato,'')) LIKE '%PRESTACI%'
    ORDER BY nombre`));
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
