/* SOLO LECTURA: si el plan de cada préstamo cuadra consigo mismo. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

const cop = (v: number) => "$" + Math.round(v).toLocaleString("es-CO");

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();

  const prestamos = await ds.query(
    `SELECT prestamo_id, nombre, mes_inicio, numero_cuotas, fecha_vencimiento,
            valor_prestamo, valor_cuota, valor_cancelado, saldo
     FROM th_prestamos ORDER BY nombre`,
  );

  console.log(`=== ${prestamos.length} préstamos ===`);

  const sinCuota: string[] = [];
  const sinNumeroCuotas: string[] = [];
  const descuadrados: string[] = [];
  const vencimientoRaro: string[] = [];

  for (const p of prestamos) {
    const prestamo = Number(p.valor_prestamo ?? 0);
    const cuota = Number(p.valor_cuota ?? 0);
    const n = Number(p.numero_cuotas ?? 0);

    if (!(cuota > 0)) sinCuota.push(p.nombre);
    if (!(n > 0)) sinNumeroCuotas.push(p.nombre);

    if (cuota > 0 && n > 0 && prestamo > 0) {
      const planeado = cuota * n;
      const diferencia = planeado - prestamo;
      // Una cuota de diferencia es el redondeo de la última; más que eso es otra cosa.
      if (Math.abs(diferencia) > cuota) {
        descuadrados.push(
          `${p.nombre}: ${n} × ${cop(cuota)} = ${cop(planeado)} contra ${cop(prestamo)} ` +
            `(${diferencia > 0 ? "sobran" : "faltan"} ${cop(Math.abs(diferencia))})`,
        );
      }
    }

    // ¿El vencimiento cae donde lo pondría el número de cuotas?
    if (p.mes_inicio && p.fecha_vencimiento && n > 0) {
      const inicio = new Date(p.mes_inicio);
      const vence = new Date(p.fecha_vencimiento);
      const meses =
        (vence.getFullYear() - inicio.getFullYear()) * 12 +
        (vence.getMonth() - inicio.getMonth()) +
        1;
      if (meses !== n) {
        vencimientoRaro.push(
          `${p.nombre}: ${p.mes_inicio.toISOString?.().slice(0, 7) ?? p.mes_inicio} → ` +
            `${p.fecha_vencimiento.toISOString?.().slice(0, 7) ?? p.fecha_vencimiento} ` +
            `son ${meses} meses, pero dice ${n} cuotas`,
        );
      }
    }
  }

  const listar = (titulo: string, xs: string[]) => {
    console.log(`\n=== ${titulo} (${xs.length}) ===`);
    for (const x of xs) console.log(`  ${x}`);
  };

  listar("sin valor de cuota", sinCuota);
  listar("sin número de cuotas", sinNumeroCuotas);
  listar("el plan no suma el préstamo", descuadrados);
  listar("el vencimiento no cuadra con las cuotas", vencimientoRaro);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
