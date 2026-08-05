/**
 * Máquina de estados de la Autorización de pago mediante cuentas entre compañías
 * (G. contable, formato GF-004-F5).
 *
 * Es un formato de uso EXCEPCIONAL (numeral 4.11 del procedimiento GF-004-P): solo
 * aplica cuando la compañía que paga el reembolso de caja menor es distinta de la que
 * registró contablemente el gasto.
 *
 * El flujo es corto a propósito. La autorización previa de la sección 2 la dan las
 * dos Gerencias Generales **por fuera del sistema**: se imprime, se firma a mano y se
 * envía. Por eso no hay pasos de aprobación — el sistema solo custodia el documento y
 * el control posterior:
 *
 *   borrador → pendiente_conciliacion (Contabilidad) → conciliado
 *
 * La sección 3 (conciliación mensual) la diligencia Contabilidad al cerrar; viaja en
 * el payload de la transición porque para entonces el formato ya no está en borrador
 * y `update` no lo deja editar.
 */

export const CUENTAS_ESTADOS = {
  borrador: { label: "Borrador", sla: null as number | null },
  pendiente_conciliacion: {
    label: "Autorizado · pendiente de conciliación (Contabilidad)",
    sla: null as number | null,
  },
  conciliado: { label: "Conciliado (cerrado)", sla: null as number | null },
} as const;

export type CuentasEstado = keyof typeof CUENTAS_ESTADOS;

/** Contabilidad concilia la operación entre compañías y cierra el formato. */
export const ROL_CONTABILIDAD = "Contabilidad";
/** Comodín transversal del sistema: Analista y Director PMO, con igual alcance. */
export { ROLES_PMO, esRolPmo } from "../../common/constants/roles.constants";

export interface CuentasTransicion {
  from: CuentasEstado;
  to: CuentasEstado;
  /** Roles autorizados (además del PMO, que siempre puede). */
  roles: string[];
  /** Si es true, solo el creador (o PMO) puede ejecutarla. */
  soloCreador?: boolean;
  /** Exige motivo (devoluciones). */
  requiereMotivo?: boolean;
  label: string;
}

export const CUENTAS_TRANSICIONES: Record<string, CuentasTransicion> = {
  enviar: {
    from: "borrador",
    to: "pendiente_conciliacion",
    roles: [],
    soloCreador: true,
    label: "Firmado por ambas gerencias · enviar a Contabilidad",
  },
  conciliar: {
    from: "pendiente_conciliacion",
    to: "conciliado",
    roles: [ROL_CONTABILIDAD],
    label: "Conciliar y cerrar",
  },
  devolver_contabilidad: {
    from: "pendiente_conciliacion",
    to: "borrador",
    roles: [ROL_CONTABILIDAD],
    requiereMotivo: true,
    label: "Devolver (falta información o soporte)",
  },
};

/** A quién se le notifica cuando el formato llega a cada estado (el que sigue actuando). */
export const CUENTAS_NOTIFICAR_AL_LLEGAR: Record<
  CuentasEstado,
  string[] | "creador"
> = {
  borrador: "creador",
  pendiente_conciliacion: [ROL_CONTABILIDAD],
  conciliado: "creador",
};
