/* SOLO LECTURA */
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as any);
  await ds.initialize();

  console.log('=== columnas de work_actas que agrega la migración ===');
  console.table(
    await ds.query(`
      SELECT column_name, data_type, character_maximum_length AS largo,
             is_nullable AS acepta_null, column_default AS por_defecto
      FROM information_schema.columns
      WHERE table_name = 'work_actas'
        AND column_name IN ('es_provisional','rq_anticipada_status',
          'rq_anticipada_justificacion','rq_anticipada_motivo',
          'rq_anticipada_solicitada_por','rq_anticipada_solicitada_at',
          'rq_anticipada_resuelta_por','rq_anticipada_resuelta_at')
      ORDER BY column_name
    `),
  );

  console.log('=== requisitions.acta_number ===');
  console.table(
    await ds.query(`
      SELECT column_name, data_type, character_maximum_length AS largo, is_nullable AS acepta_null
      FROM information_schema.columns
      WHERE table_name = 'requisitions' AND column_name = 'acta_number'
    `),
  );

  console.log('=== índice IDX_requisitions_acta ===');
  console.table(
    await ds.query(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'requisitions' AND indexname = 'IDX_requisitions_acta'
    `),
  );

  console.log('=== últimas migraciones registradas ===');
  console.table(
    await ds.query(`SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 10`),
  );

  console.log('=== ¿está registrada esta migración? ===');
  console.table(
    await ds.query(`
      SELECT id, timestamp, name FROM migrations
      WHERE name LIKE '%ActaProvisional%'
    `),
  );

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
