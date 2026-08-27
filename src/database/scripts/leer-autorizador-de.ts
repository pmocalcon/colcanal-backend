/* SOLO LECTURA: de quién cuelga una persona en la cadena de autorizaciones. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const quien = process.argv[2] ?? "delgado";
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();

  console.log(`=== quién autoriza a «${quien}» ===`);
  console.table(
    await ds.query(
      `SELECT j.user_id AS jefe_id, j.nombre AS jefe, rj.nombre_rol AS rol_jefe,
              g.nombre AS gestion, a.es_activo
       FROM autorizaciones a
       JOIN users s ON s.user_id = a.usuario_autorizado
       LEFT JOIN users j ON j.user_id = a.usuario_autorizador
       LEFT JOIN roles rj ON rj.rol_id = j.rol_id
       LEFT JOIN gestiones g ON g.gestion_id = a.gestion_id
       WHERE s.nombre ILIKE $1
       ORDER BY j.nombre`,
      [`%${quien}%`],
    ),
  );

  console.log(`=== a quién autoriza el Director TICs ===`);
  console.table(
    await ds.query(
      `SELECT s.user_id, s.nombre AS subordinado, rs.nombre_rol AS rol, a.es_activo
       FROM autorizaciones a
       JOIN users j ON j.user_id = a.usuario_autorizador
       JOIN users s ON s.user_id = a.usuario_autorizado
       LEFT JOIN roles rs ON rs.rol_id = s.rol_id
       LEFT JOIN roles rj ON rj.rol_id = j.rol_id
       WHERE rj.nombre_rol = 'Director Tics'
       ORDER BY s.nombre`,
    ),
  );

  console.log(`=== a quién autoriza Gerencia (los que le caen en «pendiente») ===`);
  console.table(
    await ds.query(
      `SELECT s.user_id, s.nombre AS subordinado, rs.nombre_rol AS rol, a.es_activo
       FROM autorizaciones a
       JOIN users j ON j.user_id = a.usuario_autorizador
       JOIN users s ON s.user_id = a.usuario_autorizado
       LEFT JOIN roles rs ON rs.rol_id = s.rol_id
       LEFT JOIN roles rj ON rj.rol_id = j.rol_id
       WHERE rj.nombre_rol = 'Gerencia' AND a.es_activo
       ORDER BY s.nombre`,
    ),
  );

  console.log(`=== las otras requisiciones con una sola firma: quién las creó ===`);
  console.table(
    await ds.query(
      `SELECT r.requisition_number, cr.nombre AS creador, rc.nombre_rol AS rol_creador,
              (SELECT string_agg(DISTINCT j.nombre, ', ')
                 FROM autorizaciones a
                 JOIN users j ON j.user_id = a.usuario_autorizador
                WHERE a.usuario_autorizado = r.created_by AND a.es_activo) AS lo_autoriza
       FROM requisitions r
       LEFT JOIN users cr ON cr.user_id = r.created_by
       LEFT JOIN roles rc ON rc.rol_id = cr.rol_id
       WHERE r.requisition_number IN ('C&C-087','C&C-088','C&C-089','CI-006','CI-022','QY-031')
       ORDER BY r.requisition_number`,
    ),
  );

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
