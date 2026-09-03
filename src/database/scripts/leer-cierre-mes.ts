/* SOLO LECTURA */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Qué va a mostrar la pantalla del «Descuento del mes» para un mes dado, calculado con
 * la misma regla del servicio. Sirve para revisar el cierre sin levantar el backend.
 *
 *     npx ts-node src/database/scripts/leer-cierre-mes.ts 2026 9
 */
async function main() {
  const anio = Number(process.argv[2]);
  const mes = Number(process.argv[3]);
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const filas = await ds.query(
    `SELECT p.prestamo_id, p.nombre, p.saldo, p.valor_cuota, p.cuota_descontar, p.nombre_nomina,
            coalesce((SELECT sum(g.valor) FROM th_prestamo_pagos g
                       WHERE g.prestamo_id = p.prestamo_id AND g.anio = $1 AND g.mes = $2
                         AND g.tipo = 'CUOTA'), 0) AS ya,
            coalesce((SELECT sum(g.valor) FROM th_prestamo_pagos g
                       WHERE g.prestamo_id = p.prestamo_id AND g.anio = $1 AND g.mes = $2
                         AND g.tipo = 'ABONO'), 0) AS abonos,
            (SELECT g.valor FROM th_prestamo_pagos g
              WHERE g.prestamo_id = p.prestamo_id AND g.tipo = 'CUOTA'
              ORDER BY g.anio DESC, g.mes DESC, g.pago_id DESC LIMIT 1) AS ultima
       FROM th_prestamos p
      ORDER BY p.nombre`,
    [anio, mes],
  );

  let total = 0;
  let cuantos = 0;
  let sinNomina = 0;
  for (const f of filas) {
    const disponible = Number(f.saldo ?? 0) + Number(f.ya);
    if (disponible <= 0 && Number(f.ya) === 0) continue;
    const pactada = Number(f.cuota_descontar ?? f.valor_cuota ?? 0) || Number(f.ultima ?? 0);
    const sugerido = Number(f.ya) > 0 ? Number(f.ya) : Math.max(0, Math.min(disponible, pactada));
    cuantos++;
    total += sugerido;
    if (!f.nombre_nomina) sinNomina++;
    console.log(
      `${String(f.nombre).slice(0, 30).padEnd(30)} debe ${Math.round(disponible).toLocaleString("es-CO").padStart(12)} ` +
        `· cuota ${Math.round(pactada).toLocaleString("es-CO").padStart(10)} ` +
        `· sugerido ${Math.round(sugerido).toLocaleString("es-CO").padStart(10)}` +
        (Number(f.abonos) ? `  (abonos ${Math.round(Number(f.abonos)).toLocaleString("es-CO")})` : "") +
        (f.nombre_nomina ? "" : "  ⚠ sin nombre en nómina"),
    );
  }
  console.log(`\n${cuantos} préstamos · total sugerido ${Math.round(total).toLocaleString("es-CO")} · ${sinNomina} sin nombre en nómina`);
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
