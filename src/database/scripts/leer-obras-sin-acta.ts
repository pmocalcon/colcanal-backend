/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Cuántas obras están sin número de acta y en qué municipios. Es la población que
 * vería la pantalla nueva de Gerencia de Proyectos.
 */
async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    logging: false,
    cache: false,
  });
  await ds.initialize();

  const resumen = await ds.query(
    `SELECT c.name AS empresa,
            COALESCE(p.name, '—') AS proyecto,
            COUNT(*) FILTER (WHERE w.record_number IS NULL OR btrim(w.record_number) = '') AS sin_acta,
            COUNT(*) AS total
       FROM works w
       JOIN companies c ON c.company_id = w.company_id
       LEFT JOIN projects p ON p.project_id = w.project_id
      GROUP BY c.name, p.name
      HAVING COUNT(*) FILTER (WHERE w.record_number IS NULL OR btrim(w.record_number) = '') > 0
      ORDER BY sin_acta DESC`,
  );
  console.log("Obras sin número de acta, por empresa/proyecto:");
  for (const r of resumen) {
    console.log(
      `  ${String(r.empresa).padEnd(48)} ${String(r.proyecto).padEnd(18)} ${String(r.sin_acta).padStart(3)} de ${r.total}`,
    );
  }

  const muestra = await ds.query(
    `SELECT w.work_id, c.name AS empresa, w.name, w.work_code, w.created_at
       FROM works w JOIN companies c ON c.company_id = w.company_id
      WHERE w.record_number IS NULL OR btrim(w.record_number) = ''
      ORDER BY w.created_at DESC LIMIT 10`,
  );
  console.log("\nMuestra (las 10 más recientes):");
  for (const m of muestra) {
    console.log(
      `  #${String(m.work_id).padEnd(4)} ${String(m.empresa).slice(0, 34).padEnd(35)} ${String(m.name).slice(0, 40).padEnd(41)} code=${m.work_code ?? "—"}`,
    );
  }

  const [{ n }] = await ds.query(
    `SELECT COUNT(*)::int AS n FROM works WHERE record_number IS NULL OR btrim(record_number) = ''`,
  );
  console.log(`\nTotal de obras sin acta: ${n}`);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
