/* ESCRITURA · autorizada expresamente por el usuario */
/**
 * Borra las planillas de horas extras que quedaron huérfanas en `th_horas_extras`.
 *
 * Al aprobar un GTH-016-F la cabecera se insertaba antes que los renglones y sin
 * transacción. Como los renglones fallaban —la fecha iba como «01/07/2026» a una columna
 * `date`—, cada clic en «Aprobar» dejaba una cabecera sin detalle que la nómina igual
 * suma. Omar Darío Vergara quedó con sus horas de agosto contadas tres veces.
 *
 * El criterio de borrado es estrecho a propósito: **solo** filas que nacieron de una
 * aprobación (así lo dice su observación) y que **no tienen ningún renglón**. Lo
 * importado del archivo histórico no cumple ninguna de las dos condiciones, así que no
 * lo puede tocar ni por error.
 *
 * Va con el cliente crudo de Postgres y no con el DataSource de la aplicación: ese tiene
 * `synchronize: true` y con solo conectarse altera el esquema de producción.
 *
 * Uso, desde la raíz de `colcanal-backend`:
 *   npx ts-node src/database/scripts/borrar-planillas-huerfanas.ts
 */
import { config } from "dotenv";
import { Client } from "pg";

config();

/** Cabecera nacida de una aprobación y sin un solo renglón: eso es una huérfana. */
const CONDICION = `
       h.observaciones LIKE 'Generada al aprobar%'
   AND NOT EXISTS (
         SELECT 1 FROM th_horas_extras_detalle d WHERE d.horas_extra_id = h.horas_extra_id
       )`;

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
    `SELECT h.horas_extra_id, h.nombre, h.identificacion, h.periodo, h.total_horas, h.observaciones
       FROM th_horas_extras h
      WHERE ${CONDICION}
      ORDER BY h.horas_extra_id`,
  );

  console.log(`Planillas huérfanas encontradas: ${antes.length}`);
  for (const r of antes) {
    console.log(
      `  #${r.horas_extra_id} ${r.nombre} (${r.identificacion}) ${r.periodo} · ${r.total_horas} h · ${r.observaciones}`,
    );
  }
  if (antes.length === 0) {
    console.log("Nada que borrar.");
    await client.end();
    return;
  }

  await client.query("BEGIN");
  try {
    const { rowCount } = await client.query(
      `DELETE FROM th_horas_extras h WHERE ${CONDICION}`,
    );
    // Se comprueba dentro de la misma transacción: si el DELETE alcanzó más filas de las
    // que se listaron, todavía se puede deshacer. Un borrado de más no queda.
    if (rowCount !== antes.length) {
      throw new Error(
        `Se iban a borrar ${antes.length} y el DELETE tocó ${rowCount}. Se revierte y no se borra nada.`,
      );
    }
    await client.query("COMMIT");
    console.log(`\nBorradas: ${rowCount}`);
  } catch (e) {
    await client.query("ROLLBACK");
    await client.end();
    throw e;
  }

  const { rows: quedan } = await client.query(
    `SELECT horas_extra_id, nombre, periodo, observaciones
       FROM th_horas_extras ORDER BY horas_extra_id`,
  );
  console.log(`\nth_horas_extras queda con ${quedan.length} filas:`);
  for (const r of quedan) {
    console.log(`  #${r.horas_extra_id} ${r.nombre} · ${r.periodo} · ${r.observaciones ?? ""}`);
  }

  await client.end();
})();
