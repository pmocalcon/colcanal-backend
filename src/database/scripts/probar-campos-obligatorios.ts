/* SOLO LECTURA */
/**
 * Pasa la tabla de campos obligatorios por encima de los formatos que ya existen en
 * producción, sin tocar nada.
 *
 * Sirve para calibrar: si una regla marca como incompleto un formato que la gente
 * diligenció normalmente y se aprobó sin problema, la regla está de más y hay que
 * quitarla, no obligar a nadie a rellenar casillas para salir del paso.
 *
 * Va con el cliente crudo de Postgres y no con el DataSource de la aplicación: ese tiene
 * `synchronize: true` y con solo conectarse altera el esquema de producción.
 */
import { config } from "dotenv";
import { Client } from "pg";
import { exigirCamposObligatorios } from "../../modules/gestion-conocimiento/campos-obligatorios";

config();

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

  const { rows } = await client.query(
    `SELECT solicitud_id, formato, estado, data
       FROM gc_solicitudes
      WHERE gestion = 'talento-humano'
        AND formato IN ('GTH-007-F','GTH-009-F','GTH-016-F','GTH-018-F')
      ORDER BY formato, solicitud_id`,
  );

  let completos = 0;
  for (const r of rows) {
    const quien =
      r.data?.nombre || r.data?.nombres ||
      [r.data?.primerNombre, r.data?.primerApellido].filter(Boolean).join(" ") || "—";
    try {
      exigirCamposObligatorios(r.formato, "enviar", r.data ?? {});
      completos++;
      console.log(`✔ ${r.formato} #${r.solicitud_id} (${r.estado}) · ${quien}`);
    } catch (e: any) {
      console.log(`✘ ${r.formato} #${r.solicitud_id} (${r.estado}) · ${quien}`);
      console.log(`    ${e.message}`);
    }
  }
  console.log(`\nCompletos con las reglas nuevas: ${completos} de ${rows.length}`);
  await client.end();
})();
