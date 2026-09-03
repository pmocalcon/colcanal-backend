/* SOLO LECTURA */
/**
 * ¿A quién le afecta el salto del paso del Director de Proyecto?
 *
 * Lista los usuarios activos y, para cada uno, si tiene un Director de Proyecto que le
 * revise las horas extras. Los que NO tengan son los únicos cuya planilla arrancará en
 * Dirección Técnica. Sirve para confirmar que los PQRS siguen pasando por su director.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

const DIRECTORES = [
  "Director de Proyecto Antioquia",
  "Director de Proyecto Putumayo",
  "Director de Proyecto Quindío",
  "Director de Proyecto Valle",
];

(async () => {
  const ds = await new DataSource(dataSourceOptions).initialize();
  const filas = await ds.query(
    `SELECT u.user_id, u.nombre, r.nombre_rol,
            COALESCE(
              (SELECT string_agg(du.nombre || ' (' || dr.nombre_rol || ')', ', ')
                 FROM autorizaciones a
                 JOIN users du ON du.user_id = a.usuario_autorizador AND du.estado = true
                 JOIN roles dr ON dr.rol_id = du.rol_id
                WHERE a.usuario_autorizado = u.user_id
                  AND a.es_activo = true
                  AND dr.nombre_rol = ANY($1)), '') AS directores
       FROM users u JOIN roles r ON r.rol_id = u.rol_id
      WHERE u.estado = true
      ORDER BY r.nombre_rol, u.nombre`,
    [DIRECTORES],
  );

  const conDir = filas.filter((f: any) => f.directores);
  const sinDir = filas.filter((f: any) => !f.directores);

  console.log(`=== PASAN POR SU DIRECTOR DE PROYECTO (${conDir.length}) ===`);
  for (const f of conDir) console.log(`  ${f.nombre} · ${f.nombre_rol}  ->  ${f.directores}`);

  console.log(`\n=== ARRANCAN EN DIRECCIÓN TÉCNICA (${sinDir.length}) ===`);
  for (const f of sinDir) {
    const propio = DIRECTORES.includes(f.nombre_rol) ? "  [se revisa a sí mismo]" : "";
    console.log(`  ${f.nombre} · ${f.nombre_rol}${propio}`);
  }
  await ds.destroy();
})();
