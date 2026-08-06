/**
 * Contratos de G. Jurídica: numeración por tipología y vigilancia del vencimiento.
 *
 * ── El consecutivo ──
 * Cada tipo de contrato lleva su propia numeración, empezando en 0001: el "PS - 0007"
 * de Prestación de servicios no tiene nada que ver con el "TF - 0007" de Término Fijo.
 * Se asigna al guardar el documento del contrato y no se reasigna nunca — un contrato
 * numerado sale a firma y a archivo con ese número, así que cambiárselo después sería
 * romper la referencia de un papel que ya circuló.
 *
 * ── El vencimiento ──
 * Manda la cláusula de terminación del contrato, no la del acta de inicio. El acta
 * puede no existir todavía y, cuando existe, quien manda sobre el plazo es el contrato.
 *
 * Las fechas del formato se escriben a mano (los campos son texto con placeholder
 * "dd/mm/aaaa"), así que el parser es tolerante: acepta lo que la gente realmente
 * escribe. Lo que no se pueda leer NO se adivina — se deja sin alerta y se avisa en
 * pantalla, porque una fecha mal interpretada en un vencimiento es peor que ninguna.
 */

/** Sigla del consecutivo por tipo de contrato. Las claves son las de TIPOS_CONTRATO. */
export const SIGLA_CONTRATO: Record<string, string> = {
  "prestacion-de-servicios-profesionales": "PP",
  "prestacion-de-servicios": "PS",
  "termino-fijo": "TF",
  "termino-indefinido": "TI",
  "obra-labor": "OL",
  pasantias: "PA",
};

/** Sigla de respaldo cuando la solicitud no tiene tipo de contrato definido. */
export const SIGLA_SIN_TIPO = "CT";

/** "PS - 0001" */
export const formatearConsecutivo = (sigla: string, numero: number): string =>
  `${sigla} - ${String(numero).padStart(4, "0")}`;

/** Lee el número de un consecutivo ya emitido ("PS - 0012" → 12). null si no lo es. */
export const numeroDeConsecutivo = (
  consecutivo: unknown,
  sigla: string,
): number | null => {
  const s = String(consecutivo ?? "").trim();
  // La sigla debe coincidir: cada tipología cuenta aparte, y un "TF - 0012" no
  // puede empujar el contador de "PS".
  const m = new RegExp(`^${sigla}\\s*-\\s*(\\d+)$`, "i").exec(s);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
};

/** Días de anticipación con que se avisa el vencimiento. */
export const DIAS_ALERTA_VENCIMIENTO = 15;

/** Tipos que no vencen: no tienen fecha de terminación pactada. */
export const TIPOS_SIN_VENCIMIENTO = new Set(["termino-indefinido"]);

/**
 * Estados en los que el contrato ya existe y está corriendo. Antes de la firma no
 * hay nada que venza: un borrador con fecha de terminación no obliga a nadie.
 */
export const ESTADOS_CONTRATO_VIGENTE = new Set([
  "contrato_firmado",
  "en_solicitud_polizas",
  "en_aprobacion_polizas",
  "en_pago_polizas",
  "en_verificacion_garantias",
  "en_designacion_supervisor",
  "en_acta_inicio",
  "finalizado",
]);

/** Acción con la que queda la alerta en la bitácora de la solicitud. */
export const ACCION_ALERTA_VENCIMIENTO = "alerta_vencimiento";

/** Acción de la RQ de póliza pedida a mano, fuera del flujo automático. */
export const ACCION_RQ_POLIZA = "solicitud_rq_poliza";

/** Acción con la que queda en la bitácora el aviso de inicio del contrato. */
export const ACCION_NOTIFICACION_INICIO = "notificacion_inicio_contrato";

/**
 * Nombres iguales salvo tildes, mayúsculas o espacios de más.
 *
 * La designación de supervisor guarda el nombre escrito a mano, no el usuario, así
 * que para avisarle hay que emparejarlo con la lista de usuarios. "JORGE  FONG" y
 * "Jorge Fong" son la misma persona; lo que no coincida se reporta como no
 * encontrado en vez de callarse.
 */
export const mismoNombre = (a: string, b: string): boolean => {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  return norm(a) !== "" && norm(a) === norm(b);
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const sinTildes = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Fecha escrita a mano → Date (a medianoche local). null si no se entiende.
 *
 * Se aceptan los formatos que aparecen en los formatos diligenciados:
 *   31/12/2026 · 31-12-2026 · 2026-12-31 · 31 de diciembre de 2026
 *
 * El día va primero salvo en el formato ISO: es lo que dice el placeholder del
 * formulario ("dd/mm/aaaa") y es la convención del país. Un "05/03/2026" se lee
 * 5 de marzo, no 3 de mayo.
 */
export const parsearFecha = (valor: unknown): Date | null => {
  const s = String(valor ?? "").trim();
  if (!s) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) return armar(+iso[1], +iso[2], +iso[3]);

  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
  if (dmy) {
    const anio = +dmy[3];
    return armar(anio < 100 ? 2000 + anio : anio, +dmy[2], +dmy[1]);
  }

  const texto = /^(\d{1,2})\s+de\s+([a-zñáéíóú]+)\s+de\s+(\d{4})$/i.exec(
    sinTildes(s).toLowerCase(),
  );
  if (texto) {
    const mes = MESES.indexOf(sinTildes(texto[2]));
    if (mes >= 0) return armar(+texto[3], mes + 1, +texto[1]);
  }
  return null;
};

/** Fecha válida o null; rechaza los desbordes ("31/02/2026" no es 3 de marzo). */
const armar = (anio: number, mes: number, dia: number): Date | null => {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(anio, mes - 1, dia);
  if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) {
    return null;
  }
  return d;
};

/** Días calendario de hoy a la fecha dada. Negativo = ya pasó. */
export const diasHasta = (fecha: Date, hoy = new Date()): number => {
  const a = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const b = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86400000);
};

export interface Vencimiento {
  /** Texto tal como lo escribió Jurídica. */
  texto: string;
  /** La fecha interpretada, o null si no se pudo leer. */
  fecha: Date | null;
  dias: number | null;
  /** True cuando toca avisar: entró en la ventana o ya se pasó. */
  enVentana: boolean;
}

/**
 * Estado de vencimiento de una solicitud, o null si el contrato no vence
 * (término indefinido, contrato aún sin firmar, o sin fecha escrita).
 */
export const vencimientoDe = (
  estado: string,
  data: Record<string, any> | null,
  hoy = new Date(),
): Vencimiento | null => {
  if (!ESTADOS_CONTRATO_VIGENTE.has(estado)) return null;
  if (TIPOS_SIN_VENCIMIENTO.has(String(data?.tipoContrato ?? ""))) return null;

  const texto = String(data?.contrato?.terminacion ?? "").trim();
  if (!texto) return null;

  const fecha = parsearFecha(texto);
  const dias = fecha ? diasHasta(fecha, hoy) : null;
  return {
    texto,
    fecha,
    dias,
    enVentana: dias !== null && dias <= DIAS_ALERTA_VENCIMIENTO,
  };
};
