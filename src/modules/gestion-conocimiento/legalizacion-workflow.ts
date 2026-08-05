/**
 * Máquina de estados de la Legalización de anticipos (G. contable, formato GCT-006-F).
 * Fuente: tablero "ANTICIPOS Y LEGALIZACIÓN" (rama derecha/central).
 *   Legalización del anticipo (3 días) → el Jefe valida recibos y valores y aprueba
 *   → se entrega a Contabilidad → Contabilidad causa (registro contable) → causada.
 *
 * Va enlazada a su Solicitud de Anticipo (GF-005-F) por el consecutivo, y solo puede
 * enviarse a aprobación cuando el anticipo ya fue pagado.
 * Los SLA están en días hábiles.
 */

export const LEGALIZACION_ESTADOS = {
  borrador: { label: "Borrador", sla: 3 as number | null },
  pendiente_aprobacion_jefe: {
    label: "Pendiente de aprobación del jefe (valida recibos y valores)",
    sla: 1,
  },
  pendiente_contabilidad: { label: "Entregada a Contabilidad", sla: 2 },
  causada: { label: "Causada (legalización cerrada)", sla: null as number | null },
} as const;

export type LegalizacionEstado = keyof typeof LEGALIZACION_ESTADOS;

/** Contabilidad recibe la legalización, valida el soporte y la causa. */
export const ROL_CONTABILIDAD = "Contabilidad";
/** Comodín transversal del sistema: Analista y Director PMO, con igual alcance. */
export { ROLES_PMO, esRolPmo } from "../../common/constants/roles.constants";

/**
 * Plazo máximo para legalizar el anticipo: tres (3) días calendario después de
 * finalizada la actividad (tablero: "LEGALIZACIÓN ANTICIPO · 3 DÍAS").
 */
export const LEGALIZACION_PLAZO_DIAS = 3;

/**
 * Corte mensual de caja: la legalización se recibe dentro de los cinco (5) primeros
 * días del mes (tablero: "LEGALIZA 5 PRIMEROS DÍAS DEL MES"). Es informativo: no
 * bloquea la transición, se muestra como advertencia.
 */
export const LEGALIZACION_CORTE_DIA_MES = 5;

export interface LegalizacionTransicion {
  from: LegalizacionEstado;
  to: LegalizacionEstado;
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

export const LEGALIZACION_TRANSICIONES: Record<string, LegalizacionTransicion> = {
  enviar: {
    from: "borrador",
    to: "pendiente_aprobacion_jefe",
    roles: [],
    soloCreador: true,
    label: "Enviar a aprobación del jefe",
  },
  aprobar_jefe: {
    from: "pendiente_aprobacion_jefe",
    to: "pendiente_contabilidad",
    roles: [],
    jefeAutorizador: true,
    label: "Recibos y valores validados · entregar a Contabilidad",
  },
  rechazar_jefe: {
    from: "pendiente_aprobacion_jefe",
    to: "borrador",
    roles: [],
    jefeAutorizador: true,
    requiereMotivo: true,
    label: "Devolver (recibos o valores incorrectos)",
  },
  causar: {
    from: "pendiente_contabilidad",
    to: "causada",
    roles: [ROL_CONTABILIDAD],
    label: "Causar y cerrar la legalización",
  },
  devolver_contabilidad: {
    from: "pendiente_contabilidad",
    to: "borrador",
    roles: [ROL_CONTABILIDAD],
    requiereMotivo: true,
    label: "Devolver (falta soporte o registro adecuado)",
  },
};

/**
 * A quién se le notifica cuando la legalización llega a cada estado (el que sigue
 * actuando). 'creador' = quien la elaboró; 'jefe' = el autorizador del creador
 * (se resuelve con la tabla de autorizaciones, igual que en el anticipo).
 */
export const LEGALIZACION_NOTIFICAR_AL_LLEGAR: Record<
  LegalizacionEstado,
  string[] | "creador" | "jefe"
> = {
  borrador: "creador",
  pendiente_aprobacion_jefe: "jefe",
  pendiente_contabilidad: [ROL_CONTABILIDAD],
  causada: "creador",
};
