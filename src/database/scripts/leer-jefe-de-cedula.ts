/* SOLO LECTURA: por qué una cédula trae —o no— jefe inmediato en los formatos.
 *
 * La casilla sale de la cadena cédula → ficha → correo → usuario → autorizaciones.
 * Cuando queda vacía el eslabón roto puede ser cualquiera, y este script dice cuál:
 * si la ficha no tiene correo, si ese correo no corresponde a ningún usuario, o si el
 * usuario no tiene autorizador activo.
 *
 *   npm run typeorm -- -h   # (no aplica: se corre con ts-node)
 *   npx ts-node -r tsconfig-paths/register src/database/scripts/leer-jefe-de-cedula.ts 1002147391 16865058
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const cedulas = process.argv.slice(2);
  if (cedulas.length === 0) {
    console.log("Uso: ... leer-jefe-de-cedula.ts <cedula> [<cedula>...]");
    return;
  }
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    logging: false,
  } as any);
  await ds.initialize();

  console.log("=== la cadena completa, eslabón por eslabón ===");
  console.table(
    await ds.query(
      `SELECT p.identificacion,
              p.nombre        AS ficha,
              p.correo        AS correo_ficha,
              u.user_id       AS usuario_id,
              u.email         AS correo_usuario,
              r.nombre_rol    AS rol,
              j.nombre        AS jefe,
              CASE
                WHEN p.identificacion IS NULL      THEN 'sin ficha en th_personal'
                WHEN COALESCE(p.correo,'') = ''    THEN 'la ficha no tiene correo'
                WHEN u.user_id IS NULL             THEN 'el correo no corresponde a ningun usuario'
                WHEN j.user_id IS NULL             THEN 'el usuario no tiene autorizador activo'
                ELSE 'ok'
              END AS diagnostico
       FROM th_personal p
       LEFT JOIN users u
              ON LOWER(u.email) = LOWER(p.correo)
              OR LOWER(u.email_notificacion) = LOWER(p.correo)
       LEFT JOIN roles r ON r.rol_id = u.rol_id
       LEFT JOIN autorizaciones a
              ON a.usuario_autorizado = u.user_id AND a.es_activo
       LEFT JOIN users j ON j.user_id = a.usuario_autorizador
       WHERE p.identificacion = ANY($1)
       ORDER BY p.identificacion`,
      [cedulas],
    ),
  );

  // Si el correo es el eslabón roto conviene ver si la persona sí tiene usuario, pero
  // registrado con otro correo: eso se arregla con un dato, no con código.
  console.log("=== ¿existe un usuario con ese nombre, aunque el correo no cruce? ===");
  console.table(
    await ds.query(
      `SELECT p.identificacion, p.nombre AS ficha, p.correo AS correo_ficha,
              u.user_id, u.nombre AS usuario, u.email AS correo_usuario
       FROM th_personal p
       JOIN users u
         ON LOWER(SPLIT_PART(TRIM(u.nombre), ' ', 1)) = LOWER(SPLIT_PART(TRIM(p.nombre), ' ', 1))
       WHERE p.identificacion = ANY($1)
       ORDER BY p.identificacion, u.nombre`,
      [cedulas],
    ),
  );

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
