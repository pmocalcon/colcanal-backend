import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Comprueba que existan las tablas y columnas de solicitudes de pago, y las crea si no.
 *
 *     npx ts-node src/database/scripts/verificar-tablas-pagos.ts
 *
 * La app corre con `synchronize: true`, así que normalmente ya están cuando esto se
 * ejecuta; el script sirve para no depender de que alguien la haya reiniciado. Todo lo
 * que hace es aditivo: `CREATE TABLE IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS`, que no
 * tocan ni borran nada de lo que ya haya.
 */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  await ds.query(`
    CREATE TABLE IF NOT EXISTS th_solicitudes_pago (
      solicitud_id  SERIAL PRIMARY KEY,
      fecha         DATE NOT NULL,
      concepto      VARCHAR(120) NOT NULL DEFAULT 'Nómina',
      periodo       VARCHAR(7),
      estado        VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
      observaciones TEXT,
      creado_por    VARCHAR(160),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  await ds.query(`
    CREATE TABLE IF NOT EXISTS th_solicitud_pago_lineas (
      linea_id       SERIAL PRIMARY KEY,
      solicitud_id   INT NOT NULL,
      orden          INT NOT NULL DEFAULT 0,
      persona_id     INT,
      tipo_id        VARCHAR(4) NOT NULL DEFAULT 'CC',
      identificacion VARCHAR(30) NOT NULL,
      nombre         VARCHAR(160) NOT NULL,
      nombres        VARCHAR(80),
      apellidos      VARCHAR(80),
      proyecto       VARCHAR(120),
      valor          NUMERIC(14,2) NOT NULL DEFAULT 0,
      banco          VARCHAR(120),
      banco_codigo   INT,
      tipo_cuenta    VARCHAR(20),
      cuenta         VARCHAR(40),
      observacion    VARCHAR(200)
    )`);

  await ds.query(`
    CREATE TABLE IF NOT EXISTS th_bancos (
      banco_id   SERIAL PRIMARY KEY,
      codigo     INT NOT NULL,
      nombre     VARCHAR(120) NOT NULL,
      activo     BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  await ds.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS th_bancos_codigo_uq ON th_bancos (codigo)`,
  );
  await ds.query(
    `CREATE INDEX IF NOT EXISTS th_solicitud_pago_lineas_solicitud_idx
     ON th_solicitud_pago_lineas (solicitud_id, orden)`,
  );

  for (const col of [
    "tipo_id VARCHAR(4)",
    "nombres VARCHAR(80)",
    "apellidos VARCHAR(80)",
  ]) {
    await ds.query(`ALTER TABLE th_personal ADD COLUMN IF NOT EXISTS ${col}`);
  }

  const conteo = await ds.query(`
    SELECT
      (SELECT count(*) FROM th_bancos)                 AS bancos,
      (SELECT count(*) FROM th_solicitudes_pago)       AS solicitudes,
      (SELECT count(*) FROM th_solicitud_pago_lineas)  AS lineas,
      (SELECT count(*) FROM th_personal WHERE banco IS NOT NULL)     AS con_banco,
      (SELECT count(*) FROM th_personal WHERE apellidos IS NOT NULL) AS con_apellidos`);
  console.log(JSON.stringify(conteo[0]));

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
