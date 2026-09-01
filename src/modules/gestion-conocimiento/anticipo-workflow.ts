/**
 * Máquina de estados del flujo de Solicitud de Anticipo (G. contable, formato GF-005-F).
 * Fuente: tablero "ANTICIPOS Y LEGALIZACIÓN".
 *   Solicitud → Aprueba Jefe (el autorizador del solicitante, como en Compras)
 *   → Aprueba Lorena (Gerencia de Proyectos) → Aprueba Gerencia (Dra. Gloria)
 *   → Entrega Aurora (rol Compras: recibe el anticipo aprobado y registra el pago) → Pagado.
 * Los SLA están en días hábiles.
 */

export const ANTICIPO_ESTADOS = {
  borrador: { label: 'Borrador', sla: null as number | null },
  pendiente_aprobacion_jefe: { label: 'Pendiente de aprobación del jefe', sla: 1 },
  pendiente_aprobacion_gp: { label: 'Pendiente de aprobación (Gerencia de Proyectos)', sla: 1 },
  pendiente_aprobacion_gerencia: { label: 'Pendiente de aprobación de Gerencia (Dra. Gloria)', sla: 1 },
  pendiente_pago: { label: 'Entrega y pago (Tesorería)', sla: 1 },
  pagado: { label: 'Pagado', sla: null as number | null },
} as const;

export type AnticipoEstado = keyof typeof ANTICIPO_ESTADOS;

/**
 * Categoría de rol de los Directores de Área (Director PMO, Comercial, Jurídico,
 * Técnico, Financiero y Administrativo). Cuando un Director de Área es quien
 * solicita, su "jefe" es la Gerencia (Dra. Gloria) — ver ROL_GERENCIA.
 */
export const CATEGORIA_DIRECTOR_AREA = 'DIRECTOR_AREA';

/** Gerencia de Proyectos (Lorena) aprueba después del jefe. */
export const ROL_GERENCIA_PROYECTOS = 'Gerencia de Proyectos';
/** Gerencia (Dra. Gloria) da la aprobación final antes del pago. */
export const ROL_GERENCIA = 'Gerencia';
/**
 * Tesorería del anticipo: quien recibe el anticipo aprobado y registra el pago. Es Aurora,
 * cuyo rol en el sistema es **Compras** (no "Coordinador Financiero"): por eso el paso de
 * pago se enruta a ese rol, tanto para el correo de aviso como para el permiso de registrar.
 */
export const ROL_TESORERIA = 'Compras';
/** Comodín transversal del sistema: Analista y Director PMO, con igual alcance. */
export { ROLES_PMO, esRolPmo } from '../../common/constants/roles.constants';

export interface AnticipoTransicion {
  from: AnticipoEstado;
  to: AnticipoEstado;
  /** Roles autorizados (además del PMO, que siempre puede). */
  roles: string[];
  /** Si es true, solo el creador (o PMO) puede ejecutarla. */
  soloCreador?: boolean;
  /** Si es true, solo el autorizador del creador (su "jefe", como en Compras) o PMO. */
  jefeAutorizador?: boolean;
  /** Exige motivo (devoluciones/rechazos). */
  requiereMotivo?: boolean;
  label: string;
}

export const ANTICIPO_TRANSICIONES: Record<string, AnticipoTransicion> = {
  enviar: {
    from: 'borrador',
    to: 'pendiente_aprobacion_jefe',
    roles: [],
    soloCreador: true,
    label: 'Enviar a aprobación del jefe',
  },
  // El "jefe" es el autorizador del creador. Excepción: si quien solicita es un
  // Director de Área, quien aprueba este paso es la Gerencia (Dra. Gloria).
  aprobar_jefe: {
    from: 'pendiente_aprobacion_jefe',
    to: 'pendiente_aprobacion_gp',
    roles: [],
    jefeAutorizador: true,
    label: 'Aprobar y enviar a Gerencia de Proyectos',
  },
  rechazar_jefe: {
    from: 'pendiente_aprobacion_jefe',
    to: 'borrador',
    roles: [],
    jefeAutorizador: true,
    requiereMotivo: true,
    label: 'Rechazar la solicitud',
  },
  aprobar_gp: {
    from: 'pendiente_aprobacion_gp',
    to: 'pendiente_aprobacion_gerencia',
    roles: [ROL_GERENCIA_PROYECTOS],
    label: 'Aprobar y enviar a Gerencia',
  },
  rechazar_gp: {
    from: 'pendiente_aprobacion_gp',
    to: 'borrador',
    roles: [ROL_GERENCIA_PROYECTOS],
    requiereMotivo: true,
    label: 'Rechazar la solicitud',
  },
  aprobar_gerencia: {
    from: 'pendiente_aprobacion_gerencia',
    to: 'pendiente_pago',
    roles: [ROL_GERENCIA],
    label: 'Aprobar y remitir a Tesorería',
  },
  rechazar_gerencia: {
    from: 'pendiente_aprobacion_gerencia',
    to: 'borrador',
    roles: [ROL_GERENCIA],
    requiereMotivo: true,
    label: 'Rechazar la solicitud',
  },
  registrar_pago: {
    from: 'pendiente_pago',
    to: 'pagado',
    roles: [ROL_TESORERIA],
    label: 'Registrar pago y finalizar',
  },
};

/**
 * A quién se le notifica cuando el anticipo llega a cada estado (el que sigue actuando).
 * 'creador' = quien creó la solicitud; 'jefe' = el autorizador del creador (se resuelve
 * con la tabla de autorizaciones, igual que la revisión en Compras).
 */
export const ANTICIPO_NOTIFICAR_AL_LLEGAR: Record<AnticipoEstado, string[] | 'creador' | 'jefe'> = {
  borrador: 'creador',
  pendiente_aprobacion_jefe: 'jefe',
  pendiente_aprobacion_gp: [ROL_GERENCIA_PROYECTOS],
  pendiente_aprobacion_gerencia: [ROL_GERENCIA],
  pendiente_pago: [ROL_TESORERIA],
  pagado: 'creador',
};
