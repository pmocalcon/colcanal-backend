/**
 * Utilidad para cálculo de días hábiles en Colombia
 * Horario laboral: 7:00 AM - 7:00 PM (12 horas por día)
 * Días hábiles: Lunes a Viernes
 * Excluye festivos colombianos
 */

// Festivos Colombia 2025
const COLOMBIA_HOLIDAYS_2025 = [
  new Date('2025-01-01'), // Año Nuevo
  new Date('2025-01-06'), // Reyes Magos
  new Date('2025-03-24'), // San José
  new Date('2025-04-17'), // Jueves Santo
  new Date('2025-04-18'), // Viernes Santo
  new Date('2025-05-01'), // Día del Trabajo
  new Date('2025-06-02'), // Ascensión del Señor
  new Date('2025-06-23'), // Corpus Christi
  new Date('2025-06-30'), // San Pedro y San Pablo
  new Date('2025-07-20'), // Independencia
  new Date('2025-08-07'), // Batalla de Boyacá
  new Date('2025-08-18'), // Asunción de la Virgen
  new Date('2025-10-13'), // Día de la Raza
  new Date('2025-11-03'), // Todos los Santos
  new Date('2025-11-17'), // Independencia de Cartagena
  new Date('2025-12-08'), // Inmaculada Concepción
  new Date('2025-12-25'), // Navidad
];

const BUSINESS_START_HOUR = 7; // 7 AM
const BUSINESS_END_HOUR = 19; // 7 PM
const BUSINESS_HOURS_PER_DAY = BUSINESS_END_HOUR - BUSINESS_START_HOUR; // 12 horas

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
  return !COLOMBIA_HOLIDAYS_2025.some(
    holiday => holiday.toISOString().split('T')[0] === dateString
  );
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

  // Si es antes de 7am, ajustar a 7am
  if (hour < BUSINESS_START_HOUR) {
    normalized.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  }
  // Si es después de 7pm, mover al siguiente día hábil a las 7am
  else if (hour >= BUSINESS_END_HOUR) {
    normalized.setDate(normalized.getDate() + 1);
    normalized.setHours(BUSINESS_START_HOUR, 0, 0, 0);
    // Verificar recursivamente si el nuevo día es hábil
    return normalizeToBusinessHours(normalized);
  }

  return normalized;
}

/**
 * Agrega días hábiles completos a una fecha
 * Un día hábil completo = 12 horas (7am - 7pm)
 *
 * @param startDate - Fecha de inicio
 * @param businessDays - Número de días hábiles a agregar
 * @returns Fecha límite (deadline) al final del último día hábil (7pm)
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

  // Establecer la hora al final del día hábil (7pm)
  current.setHours(BUSINESS_END_HOUR, 0, 0, 0);

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
