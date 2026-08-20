/* SOLO LECTURA */
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as any);
  await ds.initialize();

  console.log('=== gc_solicitudes ===');
  console.table(
    await ds.query(`
      SELECT solicitud_id, gestion, formato, estado, created_by, created_at,
             jsonb_object_keys_count.k AS campos
      FROM gc_solicitudes
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS k FROM jsonb_object_keys(coalesce(data, '{}'::jsonb))
      ) jsonb_object_keys_count ON TRUE
      ORDER BY solicitud_id
    `),
  );

  console.log('=== conteo por formato ===');
  console.table(
    await ds.query(`
      SELECT gestion, formato, estado, count(*)::int AS n
      FROM gc_solicitudes
      GROUP BY gestion, formato, estado
      ORDER BY gestion, formato
    `),
  );

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
