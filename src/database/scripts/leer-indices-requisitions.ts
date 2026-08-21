/* SOLO LECTURA — lista los índices reales de `requisitions` para ver si sobrevive
   alguno que no esté declarado en la entidad. No escribe nada. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  const filas = await ds.query(`
    SELECT i.indexname,
           i.indexdef,
           (c.conname IS NOT NULL) AS respalda_constraint
      FROM pg_indexes i
      LEFT JOIN pg_constraint c
             ON c.conindid = (quote_ident(i.schemaname) || '.' || quote_ident(i.indexname))::regclass
     WHERE i.tablename = 'requisitions'
     ORDER BY respalda_constraint, i.indexname
  `);

  console.log(`Índices en requisitions: ${filas.length}\n`);
  for (const f of filas) {
    console.log(`  ${f.respalda_constraint ? "[constraint]" : "[índice   ]"} ${f.indexname}`);
    console.log(`               ${f.indexdef}`);
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
