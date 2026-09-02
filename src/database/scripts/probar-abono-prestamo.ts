import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { TalentoHumanoService } from "../../modules/talento-humano/talento-humano.service";
import { NominaService } from "../../modules/talento-humano/nomina.service";
import { ThPersona } from "../entities/th-persona.entity";
import { ThParametroNomina } from "../entities/th-parametro-nomina.entity";
import { ThRetencionFicha } from "../entities/th-retencion-ficha.entity";
import { ThIncapacidad } from "../entities/th-incapacidad.entity";
import { ThAusentismo } from "../entities/th-ausentismo.entity";
import { ThPrestamo } from "../entities/th-prestamo.entity";
import { ThPrestamoPago } from "../entities/th-prestamo-pago.entity";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../entities/th-vacacion.entity";
import { ThBanco } from "../entities/th-banco.entity";
import { ThNovedadNomina } from "../entities/th-novedad-nomina.entity";
import { ThNominaLiquidacion } from "../entities/th-nomina-liquidacion.entity";
import { User } from "../entities/user.entity";

/**
 * Prueba de ida y vuelta del abono extraordinario, sin dejar rastro.
 *
 *     npx ts-node src/database/scripts/probar-abono-prestamo.ts [periodo] [nombreEnNomina]
 *
 * Registra un abono, comprueba que baje el saldo y que la nómina del periodo lo sume a
 * la cuota, y después lo borra y comprueba que todo vuelva a como estaba. Si algo no
 * cuadra lo dice y sale con error.
 */
async function main() {
  const periodo = process.argv[2] ?? "2026-08";
  const buscado = process.argv[3] ?? "CAVADIA";
  const VALOR = 500000;

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const th = new TalentoHumanoService(
    ds.getRepository(ThPersona), ds.getRepository(ThIncapacidad), ds.getRepository(ThAusentismo),
    ds.getRepository(ThPrestamo), ds.getRepository(ThPrestamoPago), ds.getRepository(ThHorasExtra),
    ds.getRepository(ThHorasExtraDetalle), ds.getRepository(ThVacacion), ds.getRepository(ThParametroNomina),
    ds.getRepository(ThRetencionFicha), ds.getRepository(ThBanco),
  );
  const nomina = new NominaService(
    ds.getRepository(ThPersona), ds.getRepository(ThPrestamo), ds.getRepository(ThPrestamoPago),
    ds.getRepository(ThIncapacidad), ds.getRepository(ThHorasExtra), ds.getRepository(ThHorasExtraDetalle),
    ds.getRepository(ThVacacion), ds.getRepository(ThAusentismo), ds.getRepository(ThNovedadNomina), ds.getRepository(ThNominaLiquidacion),
    ds.getRepository(ThParametroNomina),
    ds.getRepository(ThRetencionFicha),
    ds.getRepository(User),
  );

  const prestamos = await ds.getRepository(ThPrestamo).find();
  const prestamo = prestamos.find((p) => (p.nombreNomina ?? "").toUpperCase().includes(buscado));
  if (!prestamo) throw new Error(`No hay préstamo con nombre en nómina que contenga "${buscado}"`);

  const cuotaEnNomina = async () => {
    const filas = await nomina.listNovedades(periodo);
    const f = filas.find((x) => x.nombre.toUpperCase().includes(buscado));
    return f?.prestamoCuota ?? 0;
  };

  const antes = {
    cancelado: Number(prestamo.valorCancelado ?? 0),
    saldo: Number(prestamo.saldo ?? 0),
    cuota: await cuotaEnNomina(),
  };
  console.log(`préstamo #${prestamo.prestamoId} · ${prestamo.nombreNomina}`);
  console.log(`ANTES   cancelado ${antes.cancelado.toLocaleString("es-CO")} · ` +
    `saldo ${antes.saldo.toLocaleString("es-CO")} · cuota en nómina ${antes.cuota.toLocaleString("es-CO")}`);

  const [anio, mes] = periodo.split("-").map(Number);
  const pago = await th.registrarPago(prestamo.prestamoId, {
    anio, mes, valor: VALOR, tipo: "ABONO", medio: "NOMINA",
    observaciones: "Prueba automática; se borra en seguida.",
  });

  const conAbono = await ds.getRepository(ThPrestamo).findOneOrFail({ where: { prestamoId: prestamo.prestamoId } });
  const despues = {
    cancelado: Number(conAbono.valorCancelado ?? 0),
    saldo: Number(conAbono.saldo ?? 0),
    cuota: await cuotaEnNomina(),
  };
  console.log(`CON ABONO cancelado ${despues.cancelado.toLocaleString("es-CO")} · ` +
    `saldo ${despues.saldo.toLocaleString("es-CO")} · cuota en nómina ${despues.cuota.toLocaleString("es-CO")}`);

  const fallos: string[] = [];
  const check = (que: string, real: number, esperado: number) => {
    if (Math.abs(real - esperado) > 0.01) fallos.push(`${que}: ${real} y se esperaba ${esperado}`);
  };
  check("cancelado sube", despues.cancelado, antes.cancelado + VALOR);
  check("saldo baja", despues.saldo, antes.saldo - VALOR);
  check("la nómina lo suma a la cuota", despues.cuota, antes.cuota + VALOR);

  await th.eliminarPago(prestamo.prestamoId, pago.pagoId);

  const revertido = await ds.getRepository(ThPrestamo).findOneOrFail({ where: { prestamoId: prestamo.prestamoId } });
  const final = {
    cancelado: Number(revertido.valorCancelado ?? 0),
    saldo: Number(revertido.saldo ?? 0),
    cuota: await cuotaEnNomina(),
  };
  console.log(`BORRADO cancelado ${final.cancelado.toLocaleString("es-CO")} · ` +
    `saldo ${final.saldo.toLocaleString("es-CO")} · cuota en nómina ${final.cuota.toLocaleString("es-CO")}`);

  check("cancelado vuelve", final.cancelado, antes.cancelado);
  check("saldo vuelve", final.saldo, antes.saldo);
  check("la cuota vuelve", final.cuota, antes.cuota);

  await ds.destroy();
  if (fallos.length) {
    console.log("\n❌ " + fallos.join("\n❌ "));
    process.exit(1);
  }
  console.log("\n✅ el abono sube y baja el saldo, la nómina lo suma, y borrarlo deja todo como estaba.");
}

main().catch((e) => { console.error(e); process.exit(1); });
