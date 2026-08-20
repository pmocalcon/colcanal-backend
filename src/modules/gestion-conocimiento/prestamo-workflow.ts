/**
 * Máquina de estados de la Solicitud de Préstamo (G. de talento humano, GTH-007-F).
 *
 * Los pasos son los que ya trae el papel, no unos nuevos: el formato tiene tres
 * firmas —Empleado, Dirección Administrativa y, en el bloque 3, Gerencia con el
 * valor aprobado—, y el flujo las reproduce en ese orden.
 *
 *   Borrador → Firma de Dirección Administrativa → Aprobación de Gerencia → Aprobado
 *
 * Los rechazos devuelven al borrador —no hay estado "rechazado"— para que el
 * empleado corrija y lo vuelva a enviar, igual que en el anticipo (GF-005-F).
 * El motivo queda en la bitácora.
 *
 * Los SLA están en días hábiles.
 */

export const PRESTAMO_ESTADOS = {
  borrador: { label: 'Borrador', sla: null as number | null },
  pendiente_administrativa: { label: 'Pendiente de firma de Dirección Administrativa', sla: 2 },
  pendiente_gerencia: { label: 'Pendiente de aprobación de Gerencia', sla: 2 },
  aprobado: { label: 'Aprobado', sla: null as number | null },
} as const;

export type PrestamoEstado = keyof typeof PRESTAMO_ESTADOS;

/** Dirección Administrativa: el "Área Administrativa y Financiera" de la política del formato. */
export const ROL_ADMINISTRATIVA = 'Director Financiero y Administrativo';
/** Gerencia (Dra. Gloria): firma el bloque 3 y fija el valor aprobado. */
export const ROL_GERENCIA = 'Gerencia';

export interface PrestamoTransicion {
  from: PrestamoEstado;
  to: PrestamoEstado;
  /** Roles autorizados (además del PMO, que siempre puede). */
  roles: string[];
  /** Si es true, solo el creador (o PMO) puede ejecutarla. */
  soloCreador?: boolean;
  /** Exige motivo (devoluciones/rechazos). */
  requiereMotivo?: boolean;
  label: string;
}

export const PRESTAMO_TRANSICIONES: Record<string, PrestamoTransicion> = {
  enviar: {
    from: 'borrador',
    to: 'pendiente_administrativa',
    roles: [],
    soloCreador: true,
    label: 'Enviar a Dirección Administrativa',
  },
  aprobar_administrativa: {
    from: 'pendiente_administrativa',
    to: 'pendiente_gerencia',
    roles: [ROL_ADMINISTRATIVA],
    label: 'Firmar y enviar a Gerencia',
  },
  rechazar_administrativa: {
    from: 'pendiente_administrativa',
    to: 'borrador',
    roles: [ROL_ADMINISTRATIVA],
    requiereMotivo: true,
    label: 'Devolver al empleado',
  },
  aprobar_gerencia: {
    from: 'pendiente_gerencia',
    to: 'aprobado',
    roles: [ROL_GERENCIA],
    label: 'Aprobar el préstamo',
  },
  rechazar_gerencia: {
    from: 'pendiente_gerencia',
    to: 'borrador',
    roles: [ROL_GERENCIA],
    requiereMotivo: true,
    label: 'Rechazar la solicitud',
  },
};

/**
 * A quién se le notifica cuando la solicitud llega a cada estado (el que sigue actuando).
 * 'creador' = el empleado que la diligenció.
 */
export const PRESTAMO_NOTIFICAR_AL_LLEGAR: Record<PrestamoEstado, string[] | 'creador'> = {
  borrador: 'creador',
  pendiente_administrativa: [ROL_ADMINISTRATIVA],
  pendiente_gerencia: [ROL_GERENCIA],
  aprobado: 'creador',
};
