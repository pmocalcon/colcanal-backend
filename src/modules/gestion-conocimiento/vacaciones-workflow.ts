/**
 * Máquina de estados de la Solicitud de Vacaciones (G. de talento humano, GTH-018-F).
 *
 * Los cuatro pasos son los cuatro recuadros del bloque "APROBACIÓN" del propio papel:
 * la firma del empleado, el Vo.Bo. del jefe inmediato, el Vo.Bo. de Talento Humano y la
 * fecha de aprobación que estampa Gerencia.
 *
 *   Borrador (el empleado firma y envía)
 *     → Vo.Bo. del jefe inmediato
 *     → Vo.Bo. de Talento Humano
 *     → Aprobación de Gerencia
 *     → Aprobada
 *
 * Los rechazos devuelven al borrador con motivo, igual que en los demás formatos.
 */

export const VACACIONES_ESTADOS = {
  borrador: { label: "Borrador", sla: null as number | null },
  pendiente_jefe: { label: "Pendiente de Vo.Bo. del jefe inmediato", sla: 2 },
  pendiente_talento_humano: { label: "Pendiente de Vo.Bo. de Talento Humano", sla: 2 },
  pendiente_gerencia: { label: "Pendiente de aprobación de Gerencia", sla: 1 },
  aprobado: { label: "Aprobada", sla: null as number | null },
} as const;

export type VacacionesEstado = keyof typeof VACACIONES_ESTADOS;

/** Quien da el Vo.Bo. de Talento Humano (tercer recuadro del papel). */
export const ROL_TALENTO_HUMANO = "Coordinador Talento Humano";
/** Gerencia (Dra. Gloria): estampa la fecha de aprobación de vacaciones. */
export const ROL_GERENCIA = "Gerencia";
/** Comodín transversal del sistema: Analista y Director PMO, con igual alcance. */
export { ROLES_PMO, esRolPmo } from "../../common/constants/roles.constants";

export interface VacacionesTransicion {
  from: VacacionesEstado;
  to: VacacionesEstado;
  /** Roles autorizados (además del PMO, que siempre puede). Vacío en el paso por jefe. */
  roles: string[];
  soloCreador?: boolean;
  /** El autorizador del creador en la tabla `autorizaciones`, o Gerencia si no tiene. */
  jefeAutorizador?: boolean;
  requiereMotivo?: boolean;
  label: string;
}

export const VACACIONES_TRANSICIONES: Record<string, VacacionesTransicion> = {
  enviar: {
    from: "borrador",
    to: "pendiente_jefe",
    roles: [],
    soloCreador: true,
    label: "Firmar y enviar a aprobación",
  },
  aprobar_jefe: {
    from: "pendiente_jefe",
    to: "pendiente_talento_humano",
    roles: [],
    jefeAutorizador: true,
    label: "Dar Vo.Bo. y enviar a Talento Humano",
  },
  rechazar_jefe: {
    from: "pendiente_jefe",
    to: "borrador",
    roles: [],
    jefeAutorizador: true,
    requiereMotivo: true,
    label: "Devolver al empleado",
  },
  aprobar_th: {
    from: "pendiente_talento_humano",
    to: "pendiente_gerencia",
    roles: [ROL_TALENTO_HUMANO],
    label: "Dar Vo.Bo. y enviar a Gerencia",
  },
  rechazar_th: {
    from: "pendiente_talento_humano",
    to: "borrador",
    roles: [ROL_TALENTO_HUMANO],
    requiereMotivo: true,
    label: "Devolver al empleado",
  },
  aprobar_gerencia: {
    from: "pendiente_gerencia",
    to: "aprobado",
    roles: [ROL_GERENCIA],
    label: "Aprobar las vacaciones",
  },
  rechazar_gerencia: {
    from: "pendiente_gerencia",
    to: "borrador",
    roles: [ROL_GERENCIA],
    requiereMotivo: true,
    label: "Rechazar la solicitud",
  },
};

/**
 * A quién se le notifica cuando la solicitud llega a cada estado (el que sigue
 * actuando). 'jefe' = el autorizador del creador (se resuelve con la tabla de
 * autorizaciones, igual que en el permiso).
 */
export const VACACIONES_NOTIFICAR_AL_LLEGAR: Record<
  VacacionesEstado,
  string[] | "creador" | "jefe"
> = {
  borrador: "creador",
  pendiente_jefe: "jefe",
  pendiente_talento_humano: [ROL_TALENTO_HUMANO],
  pendiente_gerencia: [ROL_GERENCIA],
  aprobado: "creador",
};
