/* SOLO LECTURA — verifica qué partes de la migración 1751510000000 ya existen en
   la base y si está registrada en la tabla de migraciones. No escribe nada. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

const COLS_ACTA = [
  "es_provisional",
  "rq_anticipada_status",
  "rq_anticipada_justificacion",
  "rq_anticipada_motivo",
  "rq_anticipada_solicitada_por",
  "rq_anticipada_solicitada_at",
  "rq_anticipada_resuelta_por",
  "rq_anticipada_resuelta_at",
];

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  const reg = await ds.query(
    `SELECT id, timestamp, name FROM migrations
      WHERE name LIKE '%ActaProvisional%' OR timestamp = 1751510000000`,
  );
  console.log("== Registro en la tabla migrations ==");
  console.log(reg.length ? reg : "  NO registrada");

  const ultimas = await ds.query(
    `SELECT timestamp, name FROM migrations ORDER BY timestamp DESC LIMIT 5`,
  );
  console.log("\n== Últimas 5 migraciones registradas ==");
  for (const m of ultimas) console.log(`  ${m.timestamp}  ${m.name}`);

  console.log("\n== Columnas en work_actas ==");
  const wa = await ds.query(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_name = 'work_actas' AND column_name = ANY($1::text[])
      ORDER BY column_name`,
    [COLS_ACTA],
  );
  for (const c of COLS_ACTA) {
    const f = wa.find((x: any) => x.column_name === c);
    console.log(
      f
        ? `  OK    ${c.padEnd(30)} ${f.data_type}  null=${f.is_nullable}  default=${f.column_default ?? "-"}`
        : `  FALTA ${c}`,
    );
  }

  console.log("\n== Columna acta_number en requisitions ==");
  const rq = await ds.query(
    `SELECT column_name, data_type, character_maximum_length, is_nullable
       FROM information_schema.columns
      WHERE table_name = 'requisitions' AND column_name = 'acta_number'`,
  );
  console.log(rq.length ? `  OK    ${JSON.stringify(rq[0])}` : "  FALTA acta_number");

  console.log("\n== Índice IDX_requisitions_acta ==");
  const idx = await ds.query(
    `SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'requisitions' AND indexname = 'IDX_requisitions_acta'`,
  );
  console.log(idx.length ? `  OK    ${idx[0].indexdef}` : "  FALTA el índice");

  console.log("\n== Datos que ya usan las columnas nuevas ==");
  const uso = await ds.query(`
    SELECT (SELECT COUNT(*)::int FROM work_actas WHERE es_provisional) AS actas_provisionales,
           (SELECT COUNT(*)::int FROM work_actas WHERE rq_anticipada_status <> 'no_aplica') AS con_rq_anticipada,
           (SELECT COUNT(*)::int FROM requisitions WHERE acta_number IS NOT NULL) AS rq_con_acta_number
  `);
  console.log(" ", uso[0]);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
