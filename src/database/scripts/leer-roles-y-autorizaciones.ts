/* SOLO LECTURA */
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as any);
  await ds.initialize();

  console.log('=== roles con usuarios activos ===');
  console.table(
    await ds.query(`
      SELECT r.rol_id, r.nombre_rol, r.category,
             count(u.user_id) FILTER (WHERE u.estado) ::int AS activos,
             string_agg(u.nombre, ' · ') FILTER (WHERE u.estado) AS personas
      FROM roles r
      LEFT JOIN users u ON u.rol_id = r.rol_id
      GROUP BY r.rol_id, r.nombre_rol, r.category
      ORDER BY r.rol_id
    `),
  );

  console.log('=== autorizaciones activas (jefe → subordinado) ===');
  console.table(
    await ds.query(`
      SELECT a.usuario_autorizador AS jefe_id, j.nombre AS jefe, rj.nombre_rol AS rol_jefe,
             a.usuario_autorizado  AS sub_id,  s.nombre AS subordinado, rs.nombre_rol AS rol_sub
      FROM autorizaciones a
      LEFT JOIN users j ON j.user_id = a.usuario_autorizador
      LEFT JOIN users s ON s.user_id = a.usuario_autorizado
      LEFT JOIN roles rj ON rj.rol_id = j.rol_id
      LEFT JOIN roles rs ON rs.rol_id = s.rol_id
      WHERE a.es_activo
      ORDER BY j.nombre, s.nombre
    `),
  );

  console.log('=== usuarios activos SIN autorizador ===');
  console.table(
    await ds.query(`
      SELECT u.user_id, u.nombre, r.nombre_rol, r.category
      FROM users u
      LEFT JOIN roles r ON r.rol_id = u.rol_id
      WHERE u.estado
        AND NOT EXISTS (
          SELECT 1 FROM autorizaciones a
          WHERE a.usuario_autorizado = u.user_id AND a.es_activo
        )
      ORDER BY r.nombre_rol, u.nombre
    `),
  );

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
