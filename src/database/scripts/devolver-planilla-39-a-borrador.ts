/* ESCRITURA · autorizada expresamente por el usuario */
/**
 * Devuelve la planilla de horas extras N.º 39 al estado anterior (borrador), para que se
 * le corrija el mes —julio → agosto— y vuelva a recorrer el flujo.
 *
 * Normalmente esto se hace con el botón «Devolver para corrección», que además deja la
 * constancia de quién la devolvió. Se pidió hacerlo por debajo, así que aquí queda un
 * renglón en el historial marcado como corrección administrativa: mover el estado sin
 * dejar rastro haría que el documento mintiera sobre su propio recorrido.
 *
 * Va con el cliente crudo de Postgres a propósito, **no** con el DataSource de la
 * aplicación: ese tiene `synchronize: true` y con solo conectarse altera el esquema de
 * producción. Para escribir un renglón no hay por qué correr ese riesgo.
 */
import { config } from "dotenv";
import { Client } from "pg";

config();

const SOLICITUD_ID = 39;
const ESTADO_ESPERADO = "pendiente_director_proyecto";

(async () => {
  const host = process.env.DB_HOST || "localhost";
  const local = host === "localhost" || host === "127.0.0.1";
  const client = new Client({
    host,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USERNAME || "canalco",
    password: process.env.DB_PASSWORD || "canalco",
    database: process.env.DB_DATABASE || "canalco",
    ssl: local ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows: antes } = await client.query(
    `SELECT solicitud_id, numero, estado, data->>'nombre' AS trabajador,
            data->>'mes' AS mes, data->>'revisadoPor' AS revisado_por
       FROM gc_solicitudes WHERE solicitud_id = $1`,
    [SOLICITUD_ID],
  );
  if (antes.length === 0) throw new Error(`No existe la solicitud ${SOLICITUD_ID}`);
  const a = antes[0];
  console.log(`ANTES  · N.º ${a.numero} · ${a.trabajador} · mes=${a.mes} · estado=${a.estado}`);
  console.log(`         firma del Director de Proyecto: ${a.revisado_por || "(ninguna)"}`);

  if (a.estado !== ESTADO_ESPERADO) {
    console.log(`\nNo se toca: se esperaba "${ESTADO_ESPERADO}" y está en "${a.estado}".`);
    await client.end();
    return;
  }

  const entrada = {
    estado: "borrador",
    accion: "devolver_director",
    fecha: new Date().toISOString(),
    userId: null,
    userName: null,
    motivo:
      "Corrección administrativa: se devuelve a borrador para cambiar el mes de julio a agosto.",
  };

  // El estado y las firmas se mueven juntos, como lo hace el flujo: una firma que quedó
  // de unas horas que después cambian diría que alguien avaló algo que no vio.
  const { rows: despues } = await client.query(
    `UPDATE gc_solicitudes
        SET estado = 'borrador',
            estado_desde = now(),
            historial = COALESCE(historial, '[]'::jsonb) || $2::jsonb,
            data = data
                   || jsonb_build_object('revisadoPor', '', 'fechaRevision', '')
                   || jsonb_build_object('revisadoTecnicaPor', '', 'fechaRevisionTecnica', '')
                   || jsonb_build_object('aprobadoGpPor', '', 'fechaAprobacionGp', '')
      WHERE solicitud_id = $1 AND estado = $3
      RETURNING estado, numero`,
    [SOLICITUD_ID, JSON.stringify([entrada]), ESTADO_ESPERADO],
  );

  console.log(`\nDESPUÉS · ${despues.length} fila(s) · estado=${despues[0]?.estado}`);
  await client.end();
})();
