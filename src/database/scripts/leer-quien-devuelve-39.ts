/* SOLO LECTURA */
/**
 * ¿Quién puede devolver la planilla N.º 3 (solicitud 39)?
 *
 * El paso lo ejecuta el Director de Proyecto que tiene a cargo a quien la reportó. Si no
 * hay ninguno registrado, el backend deja pasar a cualquiera de los cuatro. Esto lo dice.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

(async () => {
  const ds = await new DataSource(dataSourceOptions).initialize();

  const [sol] = await ds.query(
    `SELECT solicitud_id, estado, created_by FROM gc_solicitudes WHERE solicitud_id = 39`,
  );
  const [creador] = await ds.query(
    `SELECT u.user_id, u.nombre, u.cargo, r.nombre_rol
       FROM users u LEFT JOIN roles r ON r.rol_id = u.rol_id
      WHERE u.user_id = $1`,
    [sol.created_by],
  );
  console.log(`Planilla 39 · ${sol.estado}`);
  console.log(`La reportó: ${creador.nombre} · ${creador.nombre_rol} (${creador.cargo ?? "sin cargo"})\n`);

  const aCargo = await ds.query(
    `SELECT u.nombre, r.nombre_rol, u.estado
       FROM autorizaciones a
       JOIN users u ON u.user_id = a.usuario_autorizador
       LEFT JOIN roles r ON r.rol_id = u.rol_id
      WHERE a.usuario_autorizado = $1 AND a.es_activo = true`,
    [sol.created_by],
  );
  console.log(`Autorizadores registrados de ${creador.nombre}: ${aCargo.length}`);
  for (const a of aCargo) console.log(`  - ${a.nombre} · ${a.nombre_rol} · activo=${a.estado}`);

  const dires = await ds.query(
    `SELECT u.nombre, r.nombre_rol FROM users u
       JOIN roles r ON r.rol_id = u.rol_id
      WHERE u.estado = true AND r.nombre_rol LIKE 'Director de Proyecto%'
      ORDER BY r.nombre_rol`,
  );
  console.log(`\nDirectores de Proyecto activos: ${dires.length}`);
  for (const d of dires) console.log(`  - ${d.nombre} · ${d.nombre_rol}`);

  await ds.destroy();
})();
