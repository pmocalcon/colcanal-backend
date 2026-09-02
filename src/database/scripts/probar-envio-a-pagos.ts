/**
 * El botón «Enviar liquidación» arma la solicitud de pago, con el valor digitado.
 *
 *     npx ts-node src/database/scripts/probar-envio-a-pagos.ts [YYYY-MM]
 *
 * Escribe y deshace: da visto bueno a quien se pueda, arma la solicitud, comprueba y
 * borra lo que creó —solicitud, líneas, validaciones y constancia—. El correo no sale:
 * se le pasa un notificador de mentira.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { NominaService } from "../../modules/talento-humano/nomina.service";
import { PagosService } from "../../modules/talento-humano/pagos.service";
import { ValidacionNominaService } from "../../modules/talento-humano/validacion-nomina.service";
import { NotificationsService } from "../../modules/notifications/notifications.service";
import { ThPersona } from "../entities/th-persona.entity";
import { ThParametroNomina } from "../entities/th-parametro-nomina.entity";
import { ThRetencionFicha } from "../entities/th-retencion-ficha.entity";
import { ThPrestamo } from "../entities/th-prestamo.entity";
import { ThPrestamoPago } from "../entities/th-prestamo-pago.entity";
import { ThIncapacidad } from "../entities/th-incapacidad.entity";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../entities/th-vacacion.entity";
import { ThAusentismo } from "../entities/th-ausentismo.entity";
import { ThNovedadNomina } from "../entities/th-novedad-nomina.entity";
import { ThNominaLiquidacion } from "../entities/th-nomina-liquidacion.entity";
import { ThSolicitudPago } from "../entities/th-solicitud-pago.entity";
import { ThSolicitudPagoLinea } from "../entities/th-solicitud-pago-linea.entity";
import { ThValidacionNomina } from "../entities/th-validacion-nomina.entity";
import { ThEnvioNomina } from "../entities/th-envio-nomina.entity";
import { ThBanco } from "../entities/th-banco.entity";
import { User } from "../entities/user.entity";

class CorreoDePrueba {
  enviados: unknown[] = [];
  async sendEmail(m: unknown) {
    this.enviados.push(m);
    return true;
  }
}

async function main() {
  const periodo = process.argv[2] ?? "2026-07";
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();

  const nomina = new NominaService(
    ds.getRepository(ThPersona),
    ds.getRepository(ThPrestamo),
    ds.getRepository(ThPrestamoPago),
    ds.getRepository(ThIncapacidad),
    ds.getRepository(ThHorasExtra),
    ds.getRepository(ThHorasExtraDetalle),
    ds.getRepository(ThVacacion),
    ds.getRepository(ThAusentismo),
    ds.getRepository(ThNovedadNomina),
    ds.getRepository(ThNominaLiquidacion),
    ds.getRepository(ThParametroNomina),
    ds.getRepository(ThRetencionFicha),
    ds.getRepository(User),
  );
  const pagos = new PagosService(
    ds.getRepository(ThSolicitudPago),
    ds.getRepository(ThSolicitudPagoLinea),
    ds.getRepository(ThBanco),
    ds.getRepository(ThPersona),
    ds.getRepository(ThParametroNomina),
    ds.getRepository(ThValidacionNomina),
    ds.getRepository(User),
    nomina,
  );
  const correo = new CorreoDePrueba();
  const val = new ValidacionNominaService(
    ds.getRepository(ThValidacionNomina),
    ds.getRepository(ThEnvioNomina),
    ds.getRepository(ThPersona),
    ds.getRepository(ThParametroNomina),
    ds.getRepository(User),
    nomina,
    correo as unknown as NotificationsService,
    pagos,
  );

  let malo = false;
  const revisar = (que: string, ok: boolean, detalle: string) => {
    console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
    if (!ok) malo = true;
  };

  const antes = await ds.getRepository(ThSolicitudPago).count();
  const creadas: number[] = [];
  const validadas: number[] = [];

  const parametros = await ds
    .getRepository(ThParametroNomina)
    .findOne({ where: { anio: Number(periodo.slice(0, 4)) } });
  if (!parametros) throw new Error(`No hay parámetros para ${periodo.slice(0, 4)}`);

  const comprobar = async (s: any) => {
    revisar(
      "la solicitud sale del periodo",
      s.solicitud.periodo === periodo && s.lineas.length > 0,
      `${s.solicitud.concepto} · ${s.solicitud.periodo} · ${s.lineas.length} líneas`,
    );

    // Lo que se gira es lo digitado: se compara línea por línea contra th_validaciones.
    const vals = await ds.getRepository(ThValidacionNomina).find({ where: { periodo } });
    const digitado = new Map(vals.map((v) => [v.personaId, Math.round(Number(v.netoDigitado))]));
    const distintas: string[] = [];
    let cuadran = 0;
    for (const l of s.lineas) {
      const d = digitado.get(l.personaId);
      if (d == null) continue;
      if (Math.round(Number(l.valor)) === d) cuadran += 1;
      else distintas.push(`${l.nombre}: línea ${l.valor} vs digitado ${d}`);
    }
    revisar(
      "la columna Valor lleva lo digitado",
      distintas.length === 0 && cuadran > 0,
      `${cuadran} líneas cuadran${distintas.length ? " · " + distintas.join(" | ") : ""}`,
    );

    // Y donde el revisor puso un peso de más, la línea lleva el suyo y no el del sistema.
    const { filas } = await nomina.getNomina(
      periodo,
      Number(parametros.smmlv),
      Number(parametros.auxilioTransporte),
    );
    const calculado = new Map(filas.map((f) => [f.personaId, Math.round(f.netoPagar)]));
    const conDiferencia = s.lineas.filter(
      (l: any) => calculado.get(l.personaId) !== Math.round(Number(l.valor)),
    );
    revisar(
      "donde hay peso de redondeo, gana el revisor",
      conDiferencia.length > 0,
      conDiferencia
        .map((l: any) => `${l.nombre}: ${l.valor} (sistema ${calculado.get(l.personaId)})`)
        .join(" | ") || "ninguna línea difiere del sistema",
    );
  };

  try {
    const estado0 = await val.estado(periodo);
    console.log(`     ${periodo}: ${estado0.total} personas, ${estado0.conFaltantes} con faltantes`);

    /*
     * Visto bueno a quien se pueda, digitando **un peso de más** en la primera: así se ve
     * si la línea del giro lleva lo digitado o lo calculado, que en ese caso son cifras
     * distintas.
     */
    const conFicha = estado0.personas.filter((p) => !p.motivo.startsWith("le falta"));
    let conPesoDeMas = 0;
    for (const p of conFicha) {
      const [ficha] = await val.buscar(periodo, p.identificacion);
      if (!ficha) continue;
      const neto = Math.round(ficha.liquidacion.netoPagar);
      if (neto <= 0) continue;
      const digitado = conPesoDeMas === 0 ? neto + 1 : neto;
      await val.validar(periodo, p.personaId, digitado, "prueba automática");
      validadas.push(p.personaId);
      if (digitado !== neto) conPesoDeMas += 1;
    }
    revisar(
      "se validaron las que tienen la ficha completa",
      validadas.length > 0 && conPesoDeMas === 1,
      `${validadas.length} validadas, una con un peso de más`,
    );

    const estado1 = await val.estado(periodo);
    if (estado1.bloqueos.length > 0) {
      // Con fichas incompletas el envío no se puede hacer —y así debe ser—, pero lo que
      // el envío arma sí se puede probar: es lo mismo que llama por dentro.
      console.log(`     no se puede mandar todavía: ${estado1.bloqueos.join(" ")}`);
      const s = await pagos.crearDesdeLiquidacion(periodo);
      creadas.push(s.solicitud.solicitudId);
      await comprobar(s);

      const otra = await pagos.crearDesdeLiquidacion(periodo);
      revisar(
        "mandar dos veces no crea dos solicitudes",
        otra.solicitud.solicitudId === s.solicitud.solicitudId,
        `sigue siendo la ${s.solicitud.solicitudId}`,
      );
    } else {
      const estado2 = await val.enviar(periodo);
      revisar("el envío queda registrado", !!estado2.envio, `${estado2.envio?.empleados} empleados`);
      revisar("salió el correo", correo.enviados.length > 0, `${correo.enviados.length}`);

      const lista = await pagos.list();
      const suya = lista.find((x: any) => x.periodo === periodo);
      revisar("quedó la solicitud de pago", !!suya, `solicitud ${suya?.solicitudId}`);
      if (suya) {
        creadas.push(suya.solicitudId);
        const s = await pagos.get(suya.solicitudId);
        await comprobar(s);
        revisar(
          "la constancia cuenta las líneas del giro, no las revisadas",
          estado2.envio?.empleados === s.lineas.length,
          `${estado2.envio?.empleados} en la constancia · ${s.lineas.length} líneas`,
        );
      }
    }
  } finally {
    for (const id of creadas) {
      await ds.getRepository(ThSolicitudPagoLinea).delete({ solicitudId: id });
      await ds.getRepository(ThSolicitudPago).delete({ solicitudId: id });
    }
    await ds.getRepository(ThEnvioNomina).delete({ periodo });
    for (const personaId of validadas) {
      await ds.getRepository(ThValidacionNomina).delete({ periodo, personaId });
    }
    const despues = await ds.getRepository(ThSolicitudPago).count();
    const sueltas = await ds.getRepository(ThValidacionNomina).count({ where: { periodo } });
    revisar(
      "la base queda como estaba",
      despues === antes && sueltas === 0,
      `${antes} solicitudes antes, ${despues} después · ${sueltas} validaciones sueltas`,
    );
    await ds.destroy();
  }

  console.log(malo ? "HAY ALGO MAL" : "TODO CUADRA");
  if (malo) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
