/* SOLO LECTURA */
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

/**
 * ¿A quién le puede llegar de verdad un correo de los flujos nuevos?
 * El notificador usa `email_notificacion` y, si está vacío, `email`.
 */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as any);
  await ds.initialize();

  console.log('=== actores de los flujos: PQRS, directores, gerencias y administrativa ===');
  console.table(
    await ds.query(`
      SELECT u.user_id, u.nombre, r.nombre_rol,
             u.email,
             u.email_notificacion,
             COALESCE(NULLIF(btrim(u.email_notificacion), ''), NULLIF(btrim(u.email), '')) AS destino
      FROM users u
      LEFT JOIN roles r ON r.rol_id = u.rol_id
      WHERE u.estado
        AND (r.category = 'PQRS'
             OR r.nombre_rol IN ('Director de Proyecto Antioquia','Director de Proyecto Quindío',
                                 'Director de Proyecto Valle','Director de Proyecto Putumayo',
                                 'Director Técnico','Gerencia de Proyectos',
                                 'Director Financiero y Administrativo','Gerencia','Director PMO',
                                 'Director Comercial','Director Jurídico','Director Tics'))
      ORDER BY r.nombre_rol, u.nombre
    `),
  );

  console.log('=== usuarios activos SIN correo alguno (no les llegaría nada) ===');
  console.table(
    await ds.query(`
      SELECT u.user_id, u.nombre, r.nombre_rol
      FROM users u
      LEFT JOIN roles r ON r.rol_id = u.rol_id
      WHERE u.estado
        AND COALESCE(NULLIF(btrim(u.email_notificacion), ''), NULLIF(btrim(u.email), '')) IS NULL
      ORDER BY r.nombre_rol, u.nombre
    `),
  );

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
