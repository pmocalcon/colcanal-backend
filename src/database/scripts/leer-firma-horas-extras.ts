/* SOLO LECTURA */
/**
 * ¿Las planillas de horas extras traen estampado quién las reportó?
 *
 * `create()` guarda `solicitadoNombre`/`solicitadoCargo` para todos los formatos, pero el
 * pie de firmas del GTH-011-F nunca los mostró. Antes de ponerlos en pantalla hay que ver
 * si de verdad están en las planillas que ya existen —incluidas las viejas—.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

(async () => {
  const ds = await new DataSource(dataSourceOptions).initialize();
  const filas = await ds.query(`
    SELECT solicitud_id, numero, estado,
           data->>'solicitadoNombre' AS nombre,
           data->>'solicitadoCargo'  AS cargo,
           created_by
      FROM gc_solicitudes
     WHERE gestion = 'talento-humano' AND formato = 'GTH-016-F'
     ORDER BY solicitud_id DESC
     LIMIT 25
  `);
  console.log(`planillas: ${filas.length}`);
  for (const f of filas) {
    console.log(
      `#${String(f.solicitud_id).padStart(4)} N.º ${String(f.numero ?? "-").padStart(3)} ` +
        `${(f.estado ?? "").padEnd(30)} nombre=${f.nombre ?? "(vacío)"} | cargo=${f.cargo ?? "(vacío)"}`,
    );
  }
  const sin = filas.filter((f: any) => !f.nombre).length;
  console.log(`\nsin nombre estampado: ${sin} de ${filas.length}`);
  await ds.destroy();
})();
