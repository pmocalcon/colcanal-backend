/**
 * Las columnas nuevas de la ficha de personal.
 *
 *     npx ts-node src/database/scripts/agregar-columnas-ficha.ts
 *
 * La app corre con `synchronize: true`, así que lo más probable es que ya existan. Esto
 * es para no depender de que alguien la reinicie, y es idempotente: `IF NOT EXISTS` en
 * todas, así que correrlo dos veces no hace nada la segunda.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

const COLUMNAS: Array<[string, string]> = [
  ["fecha_nacimiento", "DATE"],
  ["correo", "VARCHAR(160)"],
  ["sexo", "VARCHAR(20)"],
  ["estado_civil", "VARCHAR(30)"],
  ["hijos", "INT"],
  ["fecha_vencimiento_contrato", "DATE"],
  ["contrato_firmado", "BOOLEAN"],
  ["otro_si", "TEXT"],
  ["clase_riesgo", "VARCHAR(6)"],
  ["arl", "VARCHAR(80)"],
  ["eps", "VARCHAR(80)"],
  ["afp", "VARCHAR(80)"],
  ["ccf", "VARCHAR(80)"],
  ["trabajo_altura", "VARCHAR(40)"],
  ["dias_vacaciones_pendientes", "INT"],
];

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();

  for (const [nombre, tipo] of COLUMNAS) {
    await ds.query(`ALTER TABLE th_personal ADD COLUMN IF NOT EXISTS ${nombre} ${tipo}`);
  }

  const presentes = await ds.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'th_personal' AND column_name = ANY($1) ORDER BY column_name`,
    [COLUMNAS.map(([n]) => n)],
  );
  console.table(presentes);
  console.log(
    presentes.length === COLUMNAS.length
      ? `Las ${COLUMNAS.length} columnas están.`
      : `FALTAN: ${COLUMNAS.length - presentes.length}`,
  );
  await ds.destroy();
  if (presentes.length !== COLUMNAS.length) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
