import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Crea las tablas de validación y envío de nómina si no existen.
 *
 *     npx ts-node src/database/scripts/verificar-tablas-validacion.ts
 *
 * Todo es aditivo: CREATE TABLE IF NOT EXISTS, sin tocar nada de lo que ya haya.
 */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  await ds.query(`
    CREATE TABLE IF NOT EXISTS th_validaciones_nomina (
      validacion_id  SERIAL PRIMARY KEY,
      periodo        VARCHAR(7) NOT NULL,
      persona_id     INT NOT NULL,
      identificacion VARCHAR(30) NOT NULL,
      nombre         VARCHAR(160) NOT NULL,
      neto_calculado NUMERIC(14,2) NOT NULL,
      neto_digitado  NUMERIC(14,2) NOT NULL,
      validado_por   VARCHAR(160),
      validado_en    TIMESTAMPTZ,
      observaciones  TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await ds.query(`CREATE UNIQUE INDEX IF NOT EXISTS th_validaciones_nomina_uq
                  ON th_validaciones_nomina (periodo, persona_id)`);

  await ds.query(`
    CREATE TABLE IF NOT EXISTS th_envios_nomina (
      envio_id       SERIAL PRIMARY KEY,
      periodo        VARCHAR(7) NOT NULL,
      destinatarios  TEXT,
      empleados      INT NOT NULL DEFAULT 0,
      total_neto     NUMERIC(14,2) NOT NULL DEFAULT 0,
      enviado_por    VARCHAR(160),
      enviado_en     TIMESTAMPTZ,
      correo_enviado BOOLEAN NOT NULL DEFAULT false,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await ds.query(`CREATE UNIQUE INDEX IF NOT EXISTS th_envios_nomina_periodo_uq
                  ON th_envios_nomina (periodo)`);

  console.log(JSON.stringify((await ds.query(`
    SELECT (SELECT count(*) FROM th_validaciones_nomina) AS validaciones,
           (SELECT count(*) FROM th_envios_nomina)       AS envios`))[0]));
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
