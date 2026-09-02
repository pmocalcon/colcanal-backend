/* SOLO LECTURA — para cada persona que podría registrar una planilla de horas extras,
   quién quedaría habilitado para revisarla con la regla vigente. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

const DIRECTORES = [
  "Director de Proyecto Antioquia",
  "Director de Proyecto Quindío",
  "Director de Proyecto Valle",
  "Director de Proyecto Putumayo",
];

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  const todosLosDirectores = await ds.query(`
    SELECT u.user_id, u.nombre, r.nombre_rol FROM users u
      JOIN roles r ON r.rol_id = u.rol_id
     WHERE u.estado = true AND r.nombre_rol = ANY($1) ORDER BY u.nombre
  `, [DIRECTORES]);

  // Quien registra planillas: PQRS y los propios Directores de Proyecto.
  const posibles = await ds.query(`
    SELECT u.user_id, u.nombre, r.nombre_rol FROM users u
      JOIN roles r ON r.rol_id = u.rol_id
     WHERE u.estado = true AND (r.nombre_rol ILIKE '%PQRS%' OR r.nombre_rol = ANY($1))
     ORDER BY r.nombre_rol, u.nombre
  `, [DIRECTORES]);

  console.log(`Directores de Proyecto activos: ${todosLosDirectores.length}\n`);
  console.log("Si esta persona registra la planilla, la puede revisar:\n");

  for (const p of posibles) {
    const jefes = await ds.query(`
      SELECT u.nombre, r.nombre_rol FROM autorizaciones a
        JOIN users u ON u.user_id = a.usuario_autorizador
        LEFT JOIN roles r ON r.rol_id = u.rol_id
       WHERE a.usuario_autorizado = $1 AND a.es_activo = true AND u.estado = true
    `, [p.user_id]);

    const suyos = jefes.filter((j: any) => DIRECTORES.includes(j.nombre_rol));
    const esDirector = DIRECTORES.includes(p.nombre_rol);
    const quien = suyos.length > 0
      ? `SOLO ${suyos.map((d: any) => d.nombre).join(", ")}   (su Director de Proyecto)`
      : esDirector
        ? `SOLO ${p.nombre} — se revisa a sí mismo`
        : `cualquiera de los ${todosLosDirectores.length} Directores   (sin jefe asignado)`;
    console.log(`  ${p.nombre.padEnd(24)} [${(p.nombre_rol ?? "").padEnd(32)}] -> ${quien}`);
  }

  await ds.destroy();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
