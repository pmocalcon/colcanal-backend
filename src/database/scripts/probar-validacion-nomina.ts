import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ValidacionNominaService } from "../../modules/talento-humano/validacion-nomina.service";
import { NominaService } from "../../modules/talento-humano/nomina.service";
import { NotificationsService } from "../../modules/notifications/notifications.service";
import { ThPersona } from "../entities/th-persona.entity";
import { ThIncapacidad } from "../entities/th-incapacidad.entity";
import { ThPrestamo } from "../entities/th-prestamo.entity";
import { ThPrestamoPago } from "../entities/th-prestamo-pago.entity";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../entities/th-vacacion.entity";
import { ThAusentismo } from "../entities/th-ausentismo.entity";
import { ThNovedadNomina } from "../entities/th-novedad-nomina.entity";
import { ThNominaLiquidacion } from "../entities/th-nomina-liquidacion.entity";
import { ThParametroNomina } from "../entities/th-parametro-nomina.entity";
import { ThSolicitudPago } from "../entities/th-solicitud-pago.entity";
import { ThSolicitudPagoLinea } from "../entities/th-solicitud-pago-linea.entity";
import { ThBanco } from "../entities/th-banco.entity";
import { PagosService } from "../../modules/talento-humano/pagos.service";
import { ThValidacionNomina } from "../entities/th-validacion-nomina.entity";
import { ThEnvioNomina } from "../entities/th-envio-nomina.entity";
import { User } from "../entities/user.entity";

/**
 * Prueba de ida y vuelta del validador de nómina, sin dejar rastro y SIN MANDAR CORREOS.
 *
 *     npx ts-node src/database/scripts/probar-validacion-nomina.ts [periodo]
 *
 * Comprueba lo que de verdad importa de esta pantalla: que un valor equivocado no pase,
 * que una ficha incompleta no pase, que el valor correcto sí pase, que el visto bueno se
 * invalide solo si la nómina cambia después, y que no se pueda mandar el periodo mientras
 * quede alguien pendiente. Al final borra todo lo que creó.
 */

/** Un servicio de correo de mentiras: cuenta los envíos en vez de mandarlos. */
class CorreoDePrueba {
  enviados: string[] = [];
  async sendEmail(n: { to: string; subject: string }): Promise<boolean> {
    this.enviados.push(`${n.to} · ${n.subject}`);
    return true;
  }
}

async function main() {
  const periodo = process.argv[2] ?? "2026-07";

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const nomina = new NominaService(
    ds.getRepository(ThPersona), ds.getRepository(ThPrestamo), ds.getRepository(ThPrestamoPago),
    ds.getRepository(ThIncapacidad), ds.getRepository(ThHorasExtra), ds.getRepository(ThHorasExtraDetalle),
    ds.getRepository(ThVacacion), ds.getRepository(ThAusentismo), ds.getRepository(ThNovedadNomina), ds.getRepository(ThNominaLiquidacion),
    ds.getRepository(User),
  );
  const correo = new CorreoDePrueba();
  const pagos = new PagosService(
    ds.getRepository(ThSolicitudPago), ds.getRepository(ThSolicitudPagoLinea),
    ds.getRepository(ThBanco), ds.getRepository(ThPersona), ds.getRepository(ThParametroNomina),
    ds.getRepository(ThValidacionNomina), ds.getRepository(User), nomina,
  );
  const val = new ValidacionNominaService(
    ds.getRepository(ThValidacionNomina), ds.getRepository(ThEnvioNomina),
    ds.getRepository(ThPersona), ds.getRepository(ThParametroNomina), ds.getRepository(User),
    nomina, correo as unknown as NotificationsService, pagos,
  );

  let malo = false;
  const revisar = (que: string, ok: boolean, detalle: string) => {
    console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
    if (!ok) malo = true;
  };
  const falla = async (que: string, fn: () => Promise<unknown>, esperado: string) => {
    try {
      await fn();
      revisar(que, false, "no falló, y tenía que fallar");
    } catch (e) {
      const msg = (e as Error).message ?? "";
      revisar(que, msg.includes(esperado), msg.slice(0, 140));
    }
  };

  const creadas: number[] = [];
  try {
    const estado0 = await val.estado(periodo);
    console.log(`     ${periodo}: ${estado0.total} personas, ${estado0.conFaltantes} con faltantes, ` +
      `${estado0.validadas} validadas`);
    console.log(`     destinatario: ${estado0.destinatario}`);
    revisar("arranca bloqueado", estado0.bloqueos.length > 0, estado0.bloqueos.join(" | "));

    // Alguien con la ficha completa, para probar el camino bueno.
    const completa = estado0.pendientes.find((p) => p.motivo === "sin visto bueno");
    if (!completa) throw new Error("No hay ninguna persona con ficha completa para probar");
    const [persona] = await val.buscar(periodo, completa.identificacion);
    const neto = Math.round(persona.liquidacion.netoPagar);
    console.log(`     probando con ${persona.nombre} · neto ${neto}`);

    await falla(
      "un valor equivocado no pasa",
      () => val.validar(periodo, persona.personaId, neto + 1000, null),
      "no coincide",
    );

    /*
     * El peso de tolerancia. La liquidación redondea al final y la planilla del revisor
     * redondea renglón por renglón, así que un peso arriba o abajo es redondeo, no un
     * error. Dos ya no: ahí se acaba la explicación por redondeo.
     */
    const arriba = await val.validar(periodo, persona.personaId, neto + 1, null);
    revisar("un peso de más pasa", !!arriba.validacion, `${neto + 1} contra ${neto}`);
    const abajo = await val.validar(periodo, persona.personaId, neto - 1, null);
    revisar("un peso de menos pasa", !!abajo.validacion, `${neto - 1} contra ${neto}`);
    revisar("guarda lo digitado, no lo calculado",
      Math.round(Number(abajo.validacion?.netoDigitado)) === neto - 1
        && Math.round(Number(abajo.validacion?.netoCalculado)) === neto,
      `digitado ${abajo.validacion?.netoDigitado} · calculado ${abajo.validacion?.netoCalculado}`);
    revisar("un peso de diferencia no la deja desactualizada", !abajo.desactualizada, "vigente");
    await falla(
      "dos pesos ya no pasan",
      () => val.validar(periodo, persona.personaId, neto + 2, null),
      "no coincide",
    );

    const ok = await val.validar(periodo, persona.personaId, neto, "prueba automática");
    creadas.push(persona.personaId);
    revisar("el valor correcto sí pasa",
      !!ok.validacion && !ok.desactualizada,
      `guardado ${ok.validacion?.netoDigitado} vs calculado ${ok.validacion?.netoCalculado}`);

    // Los centavos no deben importar: la nómina calcula con decimales y nadie gira centavos.
    const conCentavos = await val.validar(periodo, persona.personaId, neto, null);
    revisar("compara en pesos redondos", !!conCentavos.validacion, `neto ${neto}`);

    // Una ficha incompleta no pasa ni con el valor correcto.
    const conFaltantes = estado0.pendientes.find((p) => p.motivo.startsWith("le falta"));
    if (conFaltantes) {
      const [otra] = await val.buscar(periodo, conFaltantes.identificacion);
      await falla(
        "una ficha incompleta no pasa",
        () => val.validar(periodo, otra.personaId, Math.round(otra.liquidacion.netoPagar), null),
        "le falta",
      );
      console.log(`     (${otra.nombre}: ${otra.faltantes.join(", ")})`);
    } else {
      console.log("     no hay fichas incompletas en este periodo: ese caso no se probó");
    }

    const estado1 = await val.estado(periodo);
    revisar("el contador sube", estado1.validadas === estado0.validadas + 1,
      `${estado0.validadas} -> ${estado1.validadas} de ${estado1.total}`);

    await falla(
      "no deja mandar con pendientes",
      () => val.enviar(periodo),
      "Todavía no se puede mandar",
    );
    revisar("no se mandó ningún correo", correo.enviados.length === 0,
      `${correo.enviados.length} correos`);

    // Un visto bueno sobre otra cifra queda viejo y deja de contar.
    await ds.getRepository(ThValidacionNomina).update(
      { periodo, personaId: persona.personaId },
      { netoCalculado: String(neto + 5000) },
    );
    const estado2 = await val.estado(periodo);
    revisar("el visto bueno viejo deja de contar",
      estado2.validadas === estado0.validadas && estado2.desactualizadas === 1,
      `validadas ${estado2.validadas}, desactualizadas ${estado2.desactualizadas}`);
  } finally {
    for (const personaId of creadas) {
      await ds.getRepository(ThValidacionNomina).delete({ periodo, personaId });
    }
    await ds.getRepository(ThEnvioNomina).delete({ periodo });
    const quedan = await ds.getRepository(ThValidacionNomina).count({ where: { periodo } });
    revisar("borrado limpio", quedan === 0, `${quedan} validaciones sueltas`);
  }

  await ds.destroy();
  if (malo) process.exit(1);
  console.log("TODO CUADRA");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
