/* SOLO LECTURA */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Los descuentos mes a mes de los préstamos que se pasen por argumento, para cotejarlos
 * contra la retícula de la hoja antes de escribir nada.
 *
 *     npx ts-node src/database/scripts/leer-pagos-prestamos.ts 2,20,21
 */
async function main() {
  const ids = (process.argv[2] ?? "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isInteger(x) && x > 0);
  if (!ids.length) {
    console.error("Uso: leer-pagos-prestamos.ts <ids separados por coma>");
    process.exit(1);
  }

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  const filas = await ds.query(
    `SELECT pago_id, prestamo_id, anio, mes, valor, tipo, medio, fecha, observaciones
       FROM th_prestamo_pagos
      WHERE prestamo_id = ANY($1::int[])
      ORDER BY prestamo_id, anio, mes`,
    [ids],
  );
  console.log(JSON.stringify(filas));
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
