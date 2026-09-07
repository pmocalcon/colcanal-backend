/**
 * Utilidad para cálculo de días hábiles en Colombia
 *
 * Jornada de 42 horas semanales: lunes a jueves de 7:00 a. m. a 4:30 p. m. y viernes
 * de 7:00 a. m. a 4:00 p. m. No se trabaja sábado ni domingo, ni los festivos
 * colombianos.
 *
 * El viernes cierra media hora antes, así que el fin de la jornada depende del día:
 * un plazo que vence un viernes se acaba a las 4:00, no a las 4:30. Con una sola hora
 * de cierre para toda la semana, media hora del viernes contaba como hábil sin que
 * hubiera nadie.
 */

/**
 * Los festivos se calculan, no se escriben a mano.
 *
 * Antes eran dos listas fijas —2025 y 2026— y eso tenía fecha de vencimiento: el
 * 1 de enero de 2027, sin que nadie tocara nada, todos los festivos del año
 * habrían pasado a contar como días hábiles y los SLA de compras habrían
 * empezado a vencerse antes de tiempo, en silencio.
 *
 * Las reglas son las de la Ley 51 de 1983 («Ley Emiliani»): unos festivos caen
 * en fecha fija, otros se corren al lunes siguiente, y los de Semana Santa
 * cuelgan de la Pascua. El cálculo reproduce exactamente las dos listas que
 * había escritas, así que ningún tiempo ya medido cambia.
 */

/** Domingo de Pascua por el algoritmo gregoriano anónimo, en UTC. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const addUtcDays = (d: Date, n: number): Date =>
  new Date(d.getTime() + n * 86400000);

/** Traslado al lunes siguiente. Si ya es lunes, se queda. */
const toNextMonday = (d: Date): Date => addUtcDays(d, (8 - d.getUTCDay()) % 7);

const utcKey = (d: Date): string => d.toISOString().split('T')[0];

const holidayCache = new Map<number, Set<string>>();

/** Los festivos colombianos de un año, como `YYYY-MM-DD`. */
export function getColombianHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);

  const fixed = [
    new Date(Date.UTC(year, 0, 1)), // Año Nuevo
    new Date(Date.UTC(year, 4, 1)), // Día del Trabajo
    new Date(Date.UTC(year, 6, 20)), // Independencia
    new Date(Date.UTC(year, 7, 7)), // Batalla de Boyacá
    new Date(Date.UTC(year, 11, 8)), // Inmaculada Concepción
    new Date(Date.UTC(year, 11, 25)), // Navidad
    // Semana Santa: cuelgan de la Pascua y no se trasladan.
    addUtcDays(easter, -3), // Jueves Santo
    addUtcDays(easter, -2), // Viernes Santo
  ];

  // Los que se corren al lunes siguiente.
  const emiliani = [
    new Date(Date.UTC(year, 0, 6)), // Reyes Magos
    new Date(Date.UTC(year, 2, 19)), // San José
    new Date(Date.UTC(year, 5, 29)), // San Pedro y San Pablo
    new Date(Date.UTC(year, 7, 15)), // Asunción de la Virgen
    new Date(Date.UTC(year, 9, 12)), // Día de la Raza
    new Date(Date.UTC(year, 10, 1)), // Todos los Santos
    new Date(Date.UTC(year, 10, 11)), // Independencia de Cartagena
    addUtcDays(easter, 39), // Ascensión del Señor
    addUtcDays(easter, 60), // Corpus Christi
    addUtcDays(easter, 68), // Sagrado Corazón
  ].map(toNextMonday);

  // Va en un Set porque dos festivos pueden caer el mismo lunes: en 2025, San
  // Pedro y el Sagrado Corazón coincidieron el 30 de junio.
  const set = new Set([...fixed, ...emiliani].map(utcKey));
  holidayCache.set(year, set);
  return set;
}

/**
 * Los festivos como texto `YYYY-MM-DD`, para mandárselos al frontend.
 *
 * Existe para que la lista viva en un solo sitio: las dos vistas de auditoría
 * descuentan fines de semana y festivos al medir cuánto tardó cada paso, y con
 * una copia en el frontend bastaría con tocar una para que la misma requisición
 * mostrara tiempos distintos en cada pantalla.
 *
 * Es función y no constante porque el servidor se queda arriba meses: una lista
 * calculada al arrancar se quedaría sin el año siguiente al pasar diciembre.
 */
export function colombianHolidayDates(): string[] {
  const year = new Date().getFullYear();
  const dates: string[] = [];
  for (let y = year - 2; y <= year + 2; y++) {
    dates.push(...getColombianHolidays(y));
  }
  return dates.sort();
}

const BUSINESS_START_HOUR = 7; // 7:00 a. m., todos los días

/**
 * A qué hora cierra la jornada, por día de la semana (0 = domingo).
 *
 * Solo están los días laborables; para cualquier otro se usa el cierre de lunes a
 * jueves, que no cambia nada porque sábado, domingo y festivos no son hábiles y
 * nunca llegan acá con una jornada que medir.
 */
const FIN_DE_JORNADA: Record<number, { hora: number; minuto: number }> = {
  1: { hora: 16, minuto: 30 }, // lunes
  2: { hora: 16, minuto: 30 }, // martes
  3: { hora: 16, minuto: 30 }, // miércoles
  4: { hora: 16, minuto: 30 }, // jueves
  5: { hora: 16, minuto: 0 }, //  viernes: media hora antes
};

const finDeJornada = (d: Date) =>
  FIN_DE_JORNADA[d.getDay()] ?? { hora: 16, minuto: 30 };

/**
 * Verifica si una fecha es un día hábil (no sábado, domingo ni festivo)
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();

  // Sábado (6) o Domingo (0)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Verificar si es festivo
  const dateString = date.toISOString().split('T')[0];
  return !getColombianHolidays(date.getUTCFullYear()).has(dateString);
}

/**
 * Normaliza una fecha al horario laboral
 * - Si es antes de 7am, ajusta a 7am
 * - Si es después de 7pm, ajusta al siguiente día hábil a las 7am
 * - Si es fin de semana o festivo, ajusta al siguiente día hábil a las 7am
 */
function normalizeToBusinessHours(date: Date): Date {
  const normalized = new Date(date);

  // Si no es día hábil, mover al siguiente día hábil a las 7am
  while (!isBusinessDay(normalized)) {
    normalized.setDate(normalized.getDate() + 1);
    normalized.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  }

  const hour = normalized.getHours();
  const fin = finDeJornada(normalized);

  // Si es antes de 7am, ajustar a 7am
  if (hour < BUSINESS_START_HOUR) {
    normalized.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  }
  // Si ya cerró la jornada de ese día, mover al siguiente día hábil a las 7am
  else if (hour > fin.hora || (hour === fin.hora && normalized.getMinutes() >= fin.minuto)) {
    normalized.setDate(normalized.getDate() + 1);
    normalized.setHours(BUSINESS_START_HOUR, 0, 0, 0);
    // Verificar recursivamente si el nuevo día es hábil
    return normalizeToBusinessHours(normalized);
  }

  return normalized;
}

/**
 * Agrega días hábiles completos a una fecha
 *
 * @param startDate - Fecha de inicio
 * @param businessDays - Número de días hábiles a agregar
 * @returns Fecha límite al cierre de la jornada de ese día: 4:30 p. m., o 4:00 p. m.
 *          si cae viernes
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  if (businessDays <= 0) {
    return new Date(startDate);
  }

  // Normalizar fecha de inicio al horario laboral
  let current = normalizeToBusinessHours(new Date(startDate));

  // Agregar días hábiles completos
  let daysAdded = 0;
  while (daysAdded < businessDays) {
    current.setDate(current.getDate() + 1);

    // Solo contar si es día hábil
    if (isBusinessDay(current)) {
      daysAdded++;
    }
  }

  // La hora de cierre es la del día al que se llegó: el viernes se acaba antes.
  const fin = finDeJornada(current);
  current.setHours(fin.hora, fin.minuto, 0, 0);

  return current;
}

/**
 * Calcula el número de días hábiles entre dos fechas
 *
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @returns Número de días hábiles entre las fechas
 */
export function calculateBusinessDaysBetween(startDate: Date, endDate: Date): number {
  let current = new Date(startDate);
  const end = new Date(endDate);
  let businessDays = 0;

  // Normalizar ambas fechas al inicio del día
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (current < end) {
    if (isBusinessDay(current)) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return businessDays;
}

/**
 * Calcula si una requisición está vencida según su SLA
 *
 * @param startDate - Fecha de inicio del conteo (cuando cambió al estado actual)
 * @param businessDays - Número de días hábiles permitidos
 * @returns { isOverdue: boolean, deadline: Date, daysOverdue: number }
 */
export function calculateSLA(startDate: Date, businessDays: number): {
  isOverdue: boolean;
  deadline: Date;
  daysOverdue: number;
} {
  const deadline = addBusinessDays(startDate, businessDays);
  const now = new Date();
  const isOverdue = now > deadline;

  let daysOverdue = 0;
  if (isOverdue) {
    // Calcular cuántos días hábiles han pasado desde el deadline
    daysOverdue = calculateBusinessDaysBetween(deadline, now);
  }

  return { isOverdue, deadline, daysOverdue };
}

/**
 * Configuración de SLA por estado de requisición (en días hábiles)
 */
export const SLA_CONFIG: Record<string, number> = {
  // Revisión: 1 día hábil
  'pendiente': 1,

  // Aprobación Gerencia: 1 día hábil
  'aprobada_revisor': 1,

  // Cotización: 1 día hábil
  'aprobada_gerencia': 1,

  // Orden de Compra: 2 días hábiles
  'cotizada': 2,

  // Estados sin SLA (ya procesados o en otros flujos)
  'en_cotizacion': 0,
  'en_orden_compra': 0,
  'pendiente_recepcion': 0,
  'en_recepcion': 0,
  'recepcion_completa': 0,
  'rechazada_revisor': 0,
  'rechazada_gerencia': 0,
};

/**
 * Obtiene el SLA para un estado de requisición
 * @param statusCode - Código del estado
 * @param priority - Prioridad de la requisición ('alta' = urgente, 'normal' = estándar)
 * @returns Número de días hábiles para el SLA (0 si es urgente)
 */
export function getSLAForStatus(statusCode: string, priority?: 'alta' | 'normal'): number {
  // Si es urgente (prioridad alta), el SLA es 0 días (mismo día)
  if (priority === 'alta') {
    return 0;
  }
  return SLA_CONFIG[statusCode] || 0;
}
