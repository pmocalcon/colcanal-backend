/* SOLO LECTURA */
/** Estado y periodo de las planillas de horas extras, para saber si aún se pueden editar. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

(async () => {
  const ds = await new DataSource(dataSourceOptions).initialize();
  const filas = await ds.query(`
    SELECT solicitud_id, numero, estado,
           data->>'nombre'  AS nombre,
           data->>'cedula'  AS cedula,
           data->>'mes'     AS mes,
           data->>'anio'    AS anio,
           data->>'periodo' AS periodo,
           jsonb_array_length(COALESCE(data->'filas','[]'::jsonb)) AS renglones
      FROM gc_solicitudes
     WHERE gestion = 'talento-humano' AND formato = 'GTH-016-F'
     ORDER BY solicitud_id DESC
  `);
  for (const f of filas) {
    console.log(
      `#${f.solicitud_id} N.º ${f.numero ?? "-"} | ${f.estado} | ${f.nombre} (${f.cedula}) ` +
        `| mes=${f.mes} anio=${f.anio} periodo=${f.periodo ?? "(vacío)"} | ${f.renglones} renglones`,
    );
  }
  await ds.destroy();
})();
