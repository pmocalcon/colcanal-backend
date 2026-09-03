/* SOLO LECTURA */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** ¿Hay más de una fila para el mismo préstamo y el mismo mes? Solo lee. */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  const dup = await ds.query(
    `SELECT g.prestamo_id, p.numero, p.nombre, g.anio, g.mes,
            count(*) AS filas, sum(g.valor) AS total,
            array_agg(g.pago_id ORDER BY g.pago_id) AS pagos,
            array_agg(g.valor ORDER BY g.pago_id) AS valores
       FROM th_prestamo_pagos g
       JOIN th_prestamos p ON p.prestamo_id = g.prestamo_id
      GROUP BY g.prestamo_id, p.numero, p.nombre, g.anio, g.mes
     HAVING count(*) > 1
      ORDER BY g.prestamo_id, g.anio, g.mes`,
  );
  console.log(JSON.stringify(dup, null, 1));
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
