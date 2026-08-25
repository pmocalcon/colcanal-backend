/* SOLO LECTURA — qué prioridad tienen las requisiciones y cuál es la de C&C-085. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  const c = await ds.query(`
    SELECT requisition_number, priority, length(COALESCE(priority,'')) AS largo
      FROM requisitions WHERE requisition_number = 'C&C-085'
  `);
  console.log("C&C-085:", JSON.stringify(c[0]));

  const d = await ds.query(`
    SELECT COALESCE(priority,'(nulo)') AS prioridad, COUNT(*)::int AS n
      FROM requisitions GROUP BY 1 ORDER BY n DESC
  `);
  console.log("\nValores de prioridad en toda la tabla:");
  for (const r of d) console.log(`  ${String(r.n).padStart(4)}  ${JSON.stringify(r.prioridad)}`);

  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
