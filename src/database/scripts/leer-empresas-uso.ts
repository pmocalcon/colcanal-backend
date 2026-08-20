/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Qué empresas existen y cuánto se usan. Sirve para saber si una UT se puede
 * ocultar del selector sin dejar registros huérfanos en pantalla.
 */
async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  // Tablas que referencian company_id (las que existan de verdad).
  const tablas: string[] = (
    await ds.query(
      `SELECT c.table_name
         FROM information_schema.columns c
         JOIN information_schema.tables t
           ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE c.table_schema = 'public'
          AND c.column_name = 'company_id'
          AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name`,
    )
  ).map((r: { table_name: string }) => r.table_name);

  const empresas = await ds.query(
    `SELECT company_id, name FROM companies ORDER BY company_id`,
  );

  console.log(`Tablas con company_id: ${tablas.join(", ")}\n`);

  for (const e of empresas) {
    const usos: string[] = [];
    for (const t of tablas) {
      if (t === "companies") continue;
      const [{ n }] = await ds.query(
        `SELECT COUNT(*)::int AS n FROM "${t}" WHERE company_id = $1`,
        [e.company_id],
      );
      if (n > 0) usos.push(`${t}=${n}`);
    }
    console.log(
      `${String(e.company_id).padStart(3)}  ${String(e.name).padEnd(48)} ${
        usos.length ? usos.join("  ") : "— sin registros —"
      }`,
    );
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
