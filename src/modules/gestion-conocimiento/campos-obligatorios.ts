/**
 * Qué campos no pueden ir vacíos en los cuatro formatos de Talento Humano.
 *
 * La regla es «todos», pero «todos» no puede tomarse al pie de la letra sin bloquear
 * solicitudes legítimas, así que hay tres clases de excepción y cada una está anotada
 * donde aparece:
 *
 *  1. **Lo que llena otro en su paso.** Al empleado no se le puede exigir el valor que
 *     aprueba Gerencia ni las cuotas que fija Dirección Administrativa. Esos campos se
 *     exigen en la acción de quien los escribe, no al enviar.
 *  2. **Lo que el sistema estampa.** Firmas, fechas de aprobación y nombres de quien
 *     avaló: los pone el servidor y exigirlos sería pedirle al usuario que adivine.
 *  3. **Lo que legítimamente va vacío.** El segundo nombre de quien no tiene dos, el
 *     tipo de soporte cuando no se anexa ninguno, la hora de un permiso que dura días
 *     completos. Estos llevan una condición `si` y solo se exigen cuando aplican.
 *
 * El mensaje de error nombra los campos **como se llaman en el papel**, no como se
 * llaman en el código: quien lo lee está mirando el formato, no la base de datos.
 */

import { BadRequestException } from "@nestjs/common";

export interface CampoExigido {
  /** Clave en `data`. Admite rutas con punto para las fechas en casillas: «periodoDe.mes». */
  campo: string;
  /** Cómo se llama la casilla en el formato impreso. */
  etiqueta: string;
  /** Si está, el campo solo se exige cuando esto devuelve true. */
  si?: (data: Record<string, any>) => boolean;
}

/** Lee «a.b.c» dentro de un objeto anidado. */
const valorDe = (data: Record<string, any>, ruta: string): unknown =>
  ruta.split(".").reduce<any>((o, k) => (o == null ? undefined : o[k]), data);

/**
 * Vacío es cadena en blanco, nulo o indefinido. **El cero no es vacío**: «0 días a
 * compensar» es una respuesta, no una casilla sin diligenciar, y tratarla como falta
 * obligaría a escribir cualquier otra cosa.
 */
const vacio = (v: unknown): boolean =>
  v === null || v === undefined || String(v).trim() === "";

// ── Préstamo · GTH-007-F ────────────────────────────────────────────────

const PRESTAMO_ENVIAR: CampoExigido[] = [
  { campo: "primerApellido", etiqueta: "Primer apellido" },
  { campo: "primerNombre", etiqueta: "Primer nombre" },
  // El segundo nombre y el segundo apellido NO se exigen: hay gente que no los tiene y
  // pedirlos le impediría radicar la solicitud.
  { campo: "estadoCivil", etiqueta: "Estado civil" },
  { campo: "tipoDocumento", etiqueta: "Tipo de documento" },
  { campo: "numero", etiqueta: "Número de documento" },
  { campo: "expedida", etiqueta: "Expedida en" },
  { campo: "direccion", etiqueta: "Dirección" },
  { campo: "barrio", etiqueta: "Barrio" },
  { campo: "municipio", etiqueta: "Municipio" },
  { campo: "departamento", etiqueta: "Departamento" },
  // El teléfono de residencia no se exige: mucha gente ya no tiene fijo. El celular sí.
  { campo: "celular", etiqueta: "Celular" },
  { campo: "cargo", etiqueta: "Cargo" },
  { campo: "area", etiqueta: "Área" },
  { campo: "salario", etiqueta: "Salario" },
  { campo: "valorSolicitado", etiqueta: "Valor solicitado" },
  { campo: "motivo", etiqueta: "Motivo del préstamo" },
];

const PRESTAMO_GERENCIA: CampoExigido[] = [
  { campo: "valorAprobado", etiqueta: "Valor aprobado" },
];

const PRESTAMO_ADMINISTRATIVA: CampoExigido[] = [
  { campo: "fechaDesembolso", etiqueta: "Fecha de desembolso" },
  { campo: "numeroCuotas", etiqueta: "Número de cuotas" },
  { campo: "valorCuota", etiqueta: "Valor de la cuota" },
];

// ── Permiso · GTH-009-F ─────────────────────────────────────────────────

/** True si el permiso ocurre dentro de un solo día, que es cuando las horas importan. */
const permisoDeUnDia = (d: Record<string, any>): boolean => {
  const desde = String(d.desde ?? "").trim();
  const hasta = String(d.hasta ?? "").trim();
  return !!desde && (!hasta || desde === hasta);
};

const PERMISO_ENVIAR: CampoExigido[] = [
  { campo: "proyecto", etiqueta: "Proyecto" },
  { campo: "nombre", etiqueta: "Nombre del colaborador" },
  { campo: "identificacion", etiqueta: "Identificación" },
  { campo: "cargo", etiqueta: "Cargo" },
  { campo: "jefeInmediato", etiqueta: "Jefe inmediato" },
  { campo: "desde", etiqueta: "Desde" },
  { campo: "hasta", etiqueta: "Hasta" },
  // Las horas solo se exigen en un permiso de un día: si son varios días completos, no
  // hay hora de inicio ni de fin que escribir.
  { campo: "horaDesde", etiqueta: "Hora desde", si: permisoDeUnDia },
  { campo: "horaHasta", etiqueta: "Hora hasta", si: permisoDeUnDia },
  { campo: "remuneracion", etiqueta: "Remuneración (remunerado / no remunerado)" },
  { campo: "descripcionMotivo", etiqueta: "Descripción del motivo" },
  { campo: "anexaSoporte", etiqueta: "Anexa soporte (Sí / No)" },
  // El tipo de soporte y el enlace solo tienen sentido si se anexó alguno. Exigirlos
  // cuando la casilla dice NO contradiría al propio formato, que pregunta primero si hay
  // soporte; quien marque «Sí» sí tiene que decir cuál es y dónde está.
  {
    campo: "tipoSoporte",
    etiqueta: "Tipo de soporte",
    si: (d) => d.anexaSoporte === "si",
  },
  {
    campo: "soporteLink",
    etiqueta: "Soporte de permiso (enlace)",
    si: (d) => d.anexaSoporte === "si",
  },
];

// ── Vacaciones · GTH-018-F ──────────────────────────────────────────────

/**
 * Las vacaciones las registra Talento Humano, que diligencia el formato completo —el
 * bloque «USO EXCLUSIVO ÁREA RECURSOS HUMANOS» incluido— antes de enviarlo. Por eso todo
 * se exige en el mismo paso: el papel solo se puede escribir mientras es borrador.
 */
const VACACIONES_ENVIAR: CampoExigido[] = [
  { campo: "nombres", etiqueta: "Nombres y apellidos" },
  { campo: "tipoDocumento", etiqueta: "Tipo de documento" },
  { campo: "documento", etiqueta: "Documento de identidad" },
  { campo: "cargo", etiqueta: "Denominación del cargo" },
  { campo: "areaCargo", etiqueta: "Área del cargo" },
  { campo: "fechaIngreso.dia", etiqueta: "Fecha de ingreso · día" },
  { campo: "fechaIngreso.mes", etiqueta: "Fecha de ingreso · mes" },
  { campo: "fechaIngreso.anio", etiqueta: "Fecha de ingreso · año" },
  { campo: "periodoDe.mes", etiqueta: "Periodo solicitado · de (mes)" },
  { campo: "periodoDe.anio", etiqueta: "Periodo solicitado · de (año)" },
  { campo: "periodoA.mes", etiqueta: "Periodo solicitado · a (mes)" },
  { campo: "periodoA.anio", etiqueta: "Periodo solicitado · a (año)" },
  { campo: "fechaInicio.dia", etiqueta: "Fecha inicio · día" },
  { campo: "fechaInicio.mes", etiqueta: "Fecha inicio · mes" },
  { campo: "fechaInicio.anio", etiqueta: "Fecha inicio · año" },
  { campo: "fechaFinal.dia", etiqueta: "Fecha final · día" },
  { campo: "fechaFinal.mes", etiqueta: "Fecha final · mes" },
  { campo: "fechaFinal.anio", etiqueta: "Fecha final · año" },
  { campo: "diasDisfrutar", etiqueta: "Días a disfrutar" },
  { campo: "diasCompensar", etiqueta: "Días a compensar" },

  // Uso exclusivo del área de Recursos Humanos.
  { campo: "rhFechaRecibido.dia", etiqueta: "Fecha recibido solicitud · día" },
  { campo: "rhFechaRecibido.mes", etiqueta: "Fecha recibido solicitud · mes" },
  { campo: "rhFechaRecibido.anio", etiqueta: "Fecha recibido solicitud · año" },
  { campo: "rhFechaInicio.dia", etiqueta: "Fecha de inicio concedida · día" },
  { campo: "rhFechaInicio.mes", etiqueta: "Fecha de inicio concedida · mes" },
  { campo: "rhFechaInicio.anio", etiqueta: "Fecha de inicio concedida · año" },
  { campo: "rhFechaFinal.dia", etiqueta: "Fecha final concedida · día" },
  { campo: "rhFechaFinal.mes", etiqueta: "Fecha final concedida · mes" },
  { campo: "rhFechaFinal.anio", etiqueta: "Fecha final concedida · año" },
  { campo: "rhDiasDisfrutar", etiqueta: "Días a disfrutar (RR. HH.)" },
  { campo: "rhDiasCompensar", etiqueta: "Días a compensar (RR. HH.)" },
  { campo: "rhDiasPendientes", etiqueta: "Días pendientes" },
  /*
   * El número de solicitud de RR. HH., el valor de la prima, el del anticipo y la fecha
   * de pago NO se exigen: son datos que se conocen después de aprobar, no al radicar.
   * Los dos formatos que hay en producción los tienen vacíos, y exigirlos obligaría a
   * inventar cifras o a poner ceros —que es peor que dejarlos en blanco, porque un cero
   * escrito se lee como una decisión y un blanco se lee como lo que es—.
   */
];

// ── Horas extras · GTH-016-F ────────────────────────────────────────────

const HORAS_EXTRAS_ENVIAR: CampoExigido[] = [
  { campo: "nombre", etiqueta: "Nombre" },
  { campo: "cedula", etiqueta: "Cédula" },
  { campo: "cargo", etiqueta: "Cargo" },
  { campo: "mes", etiqueta: "Mes" },
  { campo: "anio", etiqueta: "Año" },
  { campo: "ciudad", etiqueta: "Ciudad" },
];

/** Las cinco clases de hora del encabezado. Un renglón debe traer al menos una. */
const TIPOS_HORA = [
  "diurna",
  "recargoNocturno",
  "nocturna",
  "diurnaFestiva",
  "nocturnaFestiva",
];

/**
 * Revisa los renglones de la planilla de horas extras.
 *
 * Las cinco columnas de horas NO se exigen todas: un día se trabaja una clase de hora,
 * no las cinco. Lo que se exige es que el renglón traiga **alguna**, porque un renglón
 * sin horas no es un registro incompleto sino un renglón que no debería existir.
 *
 * El almuerzo y el código de labor quedan por fuera: hay jornadas sin pausa y labores
 * que no tienen código.
 */
function faltantesEnFilas(data: Record<string, any>): string[] {
  const filas: Record<string, any>[] = Array.isArray(data.filas) ? data.filas : [];
  const faltan: string[] = [];

  filas.forEach((fila, i) => {
    const n = i + 1;
    const pide = (campo: string, etiqueta: string) => {
      if (vacio(fila?.[campo])) faltan.push(`Renglón ${n}: ${etiqueta}`);
    };
    pide("fecha", "Fecha");
    pide("proyecto", "Proyecto");
    pide("region", "Región");
    pide("horaEntrada", "Hora de entrada");
    pide("horaSalida", "Hora de salida");
    // La labor es la justificación de la hora extra: sin ella el papel dice que alguien
    // trabajó de más pero no en qué. Hoy va vacía en 8 de las 10 planillas radicadas;
    // se exige de aquí en adelante y esas ocho no se tocan.
    pide("labor", "Labor ejecutada");

    const horas = (fila?.horas ?? {}) as Record<string, unknown>;
    const alguna = TIPOS_HORA.some((t) => !vacio(horas[t]) && Number(horas[t]) > 0);
    if (!alguna) faltan.push(`Renglón ${n}: no tiene horas en ninguna columna`);
  });

  return faltan;
}

// ── Tabla y comprobación ────────────────────────────────────────────────

const POR_FORMATO: Record<string, Record<string, CampoExigido[]>> = {
  "GTH-007-F": {
    enviar: PRESTAMO_ENVIAR,
    aprobar_gerencia: PRESTAMO_GERENCIA,
    aprobar_administrativa: PRESTAMO_ADMINISTRATIVA,
  },
  "GTH-009-F": { enviar: PERMISO_ENVIAR },
  "GTH-018-F": { enviar: VACACIONES_ENVIAR },
  "GTH-016-F": { enviar: HORAS_EXTRAS_ENVIAR },
};

/**
 * Comprueba los campos obligatorios del formato para esa acción y lanza si falta alguno.
 *
 * Los enumera todos de una vez en vez de detenerse en el primero: obligar a descubrir
 * las faltas de a una, reenviando el formato cada vez, es lo que hace que la gente
 * termine escribiendo un punto en cada casilla para salir del paso.
 */
export function exigirCamposObligatorios(
  formato: string,
  accion: string,
  data: Record<string, any>,
): void {
  const exigidos = POR_FORMATO[formato]?.[accion] ?? [];
  const faltan = exigidos
    .filter((c) => (c.si ? c.si(data) : true))
    .filter((c) => vacio(valorDe(data, c.campo)))
    .map((c) => c.etiqueta);

  if (formato === "GTH-016-F" && accion === "enviar") {
    const filas: unknown[] = Array.isArray(data.filas) ? data.filas : [];
    if (filas.length === 0) faltan.push("Al menos un renglón de horas");
    else faltan.push(...faltantesEnFilas(data));
  }

  if (faltan.length === 0) return;

  throw new BadRequestException(
    faltan.length === 1
      ? `Falta diligenciar: ${faltan[0]}.`
      : `Faltan ${faltan.length} campos por diligenciar: ${faltan.join(", ")}.`,
  );
}
