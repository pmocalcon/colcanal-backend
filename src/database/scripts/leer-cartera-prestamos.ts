/* SOLO LECTURA */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Qué hay hoy en la cartera de préstamos, para poder cotejarla contra la hoja
 * «Prestamos» de «01. Informe general de préstamos.xlsx» antes de tocar nada.
 *
 * No escribe: `synchronize: false` es obligatorio acá porque producción corre con
 * `synchronize: true` y abrir la conexión con el valor de la app reescribe restricciones.
 */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const prestamos = await ds.query(
    `SELECT p.prestamo_id, p.numero, p.nombre, p.identificacion, p.proyecto, p.pagare,
            p.mes_inicio, p.numero_cuotas, p.fecha_vencimiento,
            p.valor_prestamo, p.valor_cuota, p.valor_cancelado, p.saldo,
            p.nombre_nomina, p.cuota_descontar, p.solicitud_id, p.observaciones,
            (SELECT count(*) FROM th_prestamo_pagos g WHERE g.prestamo_id = p.prestamo_id) AS pagos,
            (SELECT coalesce(sum(g.valor), 0) FROM th_prestamo_pagos g WHERE g.prestamo_id = p.prestamo_id) AS suma_pagos
       FROM th_prestamos p
      ORDER BY p.numero NULLS FIRST, p.prestamo_id`,
  );

  const totales = (
    await ds.query(
      `SELECT count(*) AS prestamos,
              (SELECT count(*) FROM th_prestamo_pagos) AS pagos,
              coalesce(sum(valor_prestamo), 0) AS prestado,
              coalesce(sum(valor_cancelado), 0) AS cancelado,
              coalesce(sum(saldo), 0) AS saldo
         FROM th_prestamos`,
    )
  )[0];

  console.log(JSON.stringify({ totales, prestamos }, null, 1));
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
