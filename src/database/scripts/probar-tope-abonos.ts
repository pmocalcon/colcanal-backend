import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { TalentoHumanoService } from "../../modules/talento-humano/talento-humano.service";
import { ThPersona } from "../entities/th-persona.entity";
import { ThIncapacidad } from "../entities/th-incapacidad.entity";
import { ThAusentismo } from "../entities/th-ausentismo.entity";
import { ThPrestamo } from "../entities/th-prestamo.entity";
import { ThPrestamoPago } from "../entities/th-prestamo-pago.entity";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../entities/th-vacacion.entity";
import { ThParametroNomina } from "../entities/th-parametro-nomina.entity";
import { ThRetencionFicha } from "../entities/th-retencion-ficha.entity";
import { ThBanco } from "../entities/th-banco.entity";

/**
 * Prueba del tope de siete abonos por mes, sin dejar rastro.
 *
 *     npx ts-node src/database/scripts/probar-tope-abonos.ts [prestamoId]
 *
 * Registra siete abonos de $1 en un mes lejano —para no chocar con nada real—, comprueba
 * que el octavo sea rechazado, que el tope no estorbe en otro mes, y al final los borra
 * y verifica que el saldo quede exactamente como estaba.
 */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const th = new TalentoHumanoService(
    ds.getRepository(ThPersona), ds.getRepository(ThIncapacidad), ds.getRepository(ThAusentismo),
    ds.getRepository(ThPrestamo), ds.getRepository(ThPrestamoPago), ds.getRepository(ThHorasExtra),
    ds.getRepository(ThHorasExtraDetalle), ds.getRepository(ThVacacion), ds.getRepository(ThParametroNomina), ds.getRepository(ThRetencionFicha),
    ds.getRepository(ThBanco),
  );

  const prestamoRepo = ds.getRepository(ThPrestamo);
  const pagoRepo = ds.getRepository(ThPrestamoPago);

  const prestamoId = Number(process.argv[2])
    || (await prestamoRepo.findOne({ where: {}, order: { prestamoId: "ASC" } }))!.prestamoId;

  // Un mes en el que con seguridad no hay nada, para no tocar la cartera real.
  const ANIO = 2099;
  const MES = 6;
  const OTRO_MES = 7;

  let malo = false;
  const revisar = (que: string, ok: boolean, detalle: string) => {
    console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
    if (!ok) malo = true;
  };

  const antes = await prestamoRepo.findOne({ where: { prestamoId } });
  const saldoAntes = Number(antes!.saldo ?? 0);
  const canceladoAntes = Number(antes!.valorCancelado ?? 0);
  console.log(`     préstamo ${prestamoId} · ${antes!.nombre} · saldo ${saldoAntes}`);

  const creados: number[] = [];
  try {
    for (let i = 1; i <= 7; i += 1) {
      const pago = await th.registrarPago(prestamoId, {
        anio: ANIO, mes: MES, valor: 1, tipo: "ABONO", medio: "DIRECTO",
        observaciones: `prueba ${i}`,
      });
      creados.push(pago.pagoId);
    }
    revisar("los siete primeros entran", creados.length === 7, `${creados.length} abonos`);

    try {
      const octavo = await th.registrarPago(prestamoId, {
        anio: ANIO, mes: MES, valor: 1, tipo: "ABONO", medio: "DIRECTO",
      });
      creados.push(octavo.pagoId);
      revisar("el octavo se rechaza", false, "entró, y no tenía que entrar");
    } catch (e) {
      const msg = (e as Error).message ?? "";
      revisar("el octavo se rechaza", msg.includes("tope de 7"), msg.slice(0, 120));
    }

    // El tope es por mes: el mes siguiente arranca en cero.
    const otro = await th.registrarPago(prestamoId, {
      anio: ANIO, mes: OTRO_MES, valor: 1, tipo: "ABONO", medio: "DIRECTO",
    });
    creados.push(otro.pagoId);
    revisar("otro mes no queda bloqueado", !!otro.pagoId, `pago ${otro.pagoId} en ${OTRO_MES}/${ANIO}`);

    // Las cuotas las pone el sistema, una por mes: no deben contar contra el tope.
    const cuota = await th.registrarPago(prestamoId, {
      anio: ANIO, mes: MES, valor: 1, tipo: "CUOTA", medio: "NOMINA",
    });
    creados.push(cuota.pagoId);
    revisar("la cuota del mes no cuenta contra el tope", !!cuota.pagoId, `pago ${cuota.pagoId}`);

    const enElMes = await pagoRepo.count({ where: { prestamoId, anio: ANIO, mes: MES } });
    revisar("quedan 8 movimientos en el mes (7 abonos + 1 cuota)", enElMes === 8, String(enElMes));

    const conAbonos = await prestamoRepo.findOne({ where: { prestamoId } });
    revisar("el saldo bajó lo digitado",
      Number(conAbonos!.saldo) === saldoAntes - creados.length,
      `${saldoAntes} -> ${conAbonos!.saldo} con ${creados.length} pagos de $1`);
  } finally {
    for (const pagoId of creados) {
      await th.eliminarPago(prestamoId, pagoId).catch(() => {});
    }
    const despues = await prestamoRepo.findOne({ where: { prestamoId } });
    revisar("el saldo vuelve a como estaba",
      Number(despues!.saldo) === saldoAntes && Number(despues!.valorCancelado) === canceladoAntes,
      `saldo ${despues!.saldo} (era ${saldoAntes}), cancelado ${despues!.valorCancelado} (era ${canceladoAntes})`);
    const sobrantes = await pagoRepo.count({ where: { prestamoId, anio: ANIO } });
    revisar("no quedan pagos de prueba", sobrantes === 0, `${sobrantes} sobrantes`);
  }

  await ds.destroy();
  if (malo) process.exit(1);
  console.log("TODO CUADRA");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
