/* SOLO LECTURA — planillas de horas extras esperando al Director de Proyecto:
   quién las creó, quién lo autoriza y si hay alguien que pueda moverlas. */
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

  const pendientes = await ds.query(`
    SELECT s.solicitud_id, s.estado, s.created_by,
           s.data->>'nombre' AS trabajador, s.data->>'periodo' AS periodo,
           to_char(s.estado_desde AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI') AS desde,
           u.nombre AS creador, r.nombre_rol AS rol_creador
      FROM gc_solicitudes s
      LEFT JOIN users u ON u.user_id = s.created_by
      LEFT JOIN roles r ON r.rol_id = u.rol_id
     WHERE s.formato = 'GTH-016-F' AND s.estado = 'pendiente_director_proyecto'
     ORDER BY s.solicitud_id DESC
  `);

  console.log(`Planillas esperando al Director de Proyecto: ${pendientes.length}\n`);

  for (const p of pendientes) {
    console.log(`N.º ${p.solicitud_id} · ${p.trabajador ?? "(sin nombre)"} · ${p.periodo ?? "?"} · desde ${p.desde}`);
    console.log(`   la creó: ${p.creador ?? "?"}  [${p.rol_creador ?? "sin rol"}]`);

    const jefes = await ds.query(`
      SELECT u.user_id, u.nombre, u.estado, r.nombre_rol
        FROM autorizaciones a
        JOIN users u ON u.user_id = a.usuario_autorizador
        LEFT JOIN roles r ON r.rol_id = u.rol_id
       WHERE a.usuario_autorizado = $1 AND a.es_activo = true
    `, [p.created_by]);

    if (jefes.length === 0) {
      console.log("   autorizadores: NINGUNO");
    } else {
      for (const j of jefes) {
        console.log(`   autoriza: ${j.nombre} [${j.nombre_rol ?? "sin rol"}]${j.estado ? "" : "  (INACTIVO)"}`);
      }
    }
    const directoresACargo = jefes.filter((j: any) => j.estado && DIRECTORES.includes(j.nombre_rol));
    console.log(directoresACargo.length > 0
      ? `   -> el backend deja actuar SOLO a: ${directoresACargo.map((d: any) => d.nombre).join(", ")}`
      : `   -> sin Director de Proyecto a cargo: el backend deja actuar a CUALQUIER Director de Proyecto`);
    console.log("");
  }

  await ds.destroy();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
