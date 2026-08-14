/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Todas las combinaciones empresa:proyecto con obras en actas. */
async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  const filas = await ds.query(
    `SELECT w.company_id, w.project_id, c.name AS empresa, p.name AS proyecto,
            COUNT(*) AS obras, COUNT(DISTINCT w.record_number) AS actas
       FROM works w
       LEFT JOIN companies c ON c.company_id = w.company_id
       LEFT JOIN projects p ON p.project_id = w.project_id
      WHERE w.record_number IS NOT NULL AND w.record_number <> ''
      GROUP BY w.company_id, w.project_id, c.name, p.name
      ORDER BY w.company_id, w.project_id NULLS FIRST`,
  );

  console.log("\n== Claves companyId:projectId con obras en actas ==");
  for (const f of filas) {
    console.log(
      `  ${String(f.company_id)}:${(f.project_id ?? "").toString().padEnd(4)}`
      + ` ${String(f.obras).padStart(4)} obras  ${String(f.actas).padStart(3)} actas`
      + `   ${f.empresa}${f.proyecto ? " / " + f.proyecto : ""}`,
    );
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
