import {
  ROLES_DIRECTOR_PROYECTO,
  ROLE_NAMES,
} from "../../common/constants/roles.constants";

/**
 * Máquina de estados del Reembolso de Caja Menor (G. contable, formato GF-007-F).
 *
 * El flujo es el bloque de firmas del propio formato, en orden, más el cierre
 * contable que ya usan la legalización y las cuentas entre compañías:
 *
 *   quien elabora → Director de Proyecto → Gerente de Proyecto
 *   → Contabilidad (causa) → Pagos/Tesorería (repone la caja) → pagado
 *
 * Las tres firmas del pie no son decorativas: cada una es un estado, y quien firma
 * en el papel es quien mueve el documento en el sistema. Los dos pasos intermedios
 * van por rol y no por el autorizador del creador — el formato nombra cargos
 * concretos, no «el jefe de quien lo elaboró».
 *
 * La PRIMERA firma es la excepción: la hoja dice «AUXILIAR ADMINISTRATIVO», pero el
 * formato también lo diligencian PQRS y la Coordinadora Financiera. Así que el cargo
 * no se fija acá: se estampa el de quien elabora (`elaboradoCargo`) y el impreso lo
 * muestra tal cual. Poner la etiqueta fija haría que el papel firmado por PQRS
 * dijera que lo firmó un auxiliar administrativo, que es justo lo que no puede pasar.
 * Por eso `enviar` va por `soloCreador` y no por una lista de roles.
 *
 * Emparenta con el GF-004-F5 (cuentas entre compañías), que existe precisamente para
 * el caso excepcional de este reembolso: cuando la compañía que paga no es la que
 * registró el gasto (numeral 4.11 del procedimiento GF-004-P).
 *
 * Sin SLA: el procedimiento no fija plazos para el reembolso como sí lo hace el
 * tablero de anticipos («legalizar en 3 días», «5 primeros días del mes»). Inventar
 * un vencimiento haría que la lista mostrara documentos «vencidos» contra una regla
 * que nadie acordó. Cuando existan los plazos reales, se ponen acá.
 */

export const CAJA_MENOR_ESTADOS = {
  borrador: { label: "Borrador", sla: null as number | null },
  pendiente_director: {
    label: "Pendiente de firma del Director de Proyecto",
    sla: null as number | null,
  },
  pendiente_gerente: {
    label: "Pendiente de firma del Gerente de Proyecto",
    sla: null as number | null,
  },
  pendiente_contabilidad: {
    label: "Entregado a Contabilidad",
    sla: null as number | null,
  },
  pendiente_pago: {
    label: "Causado · pendiente de pago (Tesorería)",
    sla: null as number | null,
  },
  pagado: {
    label: "Pagado (caja repuesta)",
    sla: null as number | null,
  },
} as const;

export type CajaMenorEstado = keyof typeof CAJA_MENOR_ESTADOS;

/** Contabilidad causa el gasto y lo remite a pagos. */
export const ROL_CONTABILIDAD = "Contabilidad";
/**
 * Quien repone la caja. Es Aurora, cuyo rol en el sistema es **Compras** y no
 * "Coordinador Financiero": el paso de pago se enruta a ese rol, igual que en el
 * anticipo (GF-005-F), tanto para el correo de aviso como para el permiso.
 */
export const ROL_TESORERIA = "Compras";
/** El «Gerente de Proyecto» del pie de firmas es la Gerencia de Proyectos. */
export const ROL_GERENTE_PROYECTO = ROLE_NAMES.GERENCIA_PROYECTOS;
/** Los cuatro directores de proyecto, uno por regional. */
export const ROLES_DIRECTOR = ROLES_DIRECTOR_PROYECTO;
/** Comodín transversal del sistema: Analista y Director PMO, con igual alcance. */
export { ROLES_PMO, esRolPmo } from "../../common/constants/roles.constants";

export interface CajaMenorTransicion {
  from: CajaMenorEstado;
  to: CajaMenorEstado;
  /** Roles autorizados (además del PMO, que siempre puede). */
  roles: string[];
  /** Si es true, solo el creador (o PMO) puede ejecutarla. */
  soloCreador?: boolean;
  /** Exige motivo (devoluciones). */
  requiereMotivo?: boolean;
  label: string;
}

export const CAJA_MENOR_TRANSICIONES: Record<string, CajaMenorTransicion> = {
  enviar: {
    from: "borrador",
    to: "pendiente_director",
    roles: [],
    soloCreador: true,
    label: "Enviar a firma del Director de Proyecto",
  },
  aprobar_director: {
    from: "pendiente_director",
    to: "pendiente_gerente",
    roles: [...ROLES_DIRECTOR_PROYECTO],
    label: "Firmar y enviar al Gerente de Proyecto",
  },
  devolver_director: {
    from: "pendiente_director",
    to: "borrador",
    roles: [...ROLES_DIRECTOR_PROYECTO],
    requiereMotivo: true,
    label: "Devolver (facturas o valores incorrectos)",
  },
  aprobar_gerente: {
    from: "pendiente_gerente",
    to: "pendiente_contabilidad",
    roles: [ROL_GERENTE_PROYECTO],
    label: "Firmar y entregar a Contabilidad",
  },
  devolver_gerente: {
    from: "pendiente_gerente",
    to: "borrador",
    roles: [ROL_GERENTE_PROYECTO],
    requiereMotivo: true,
    label: "Devolver (facturas o valores incorrectos)",
  },
  causar: {
    from: "pendiente_contabilidad",
    to: "pendiente_pago",
    roles: [ROL_CONTABILIDAD],
    label: "Causar y remitir a pagos",
  },
  registrar_pago: {
    from: "pendiente_pago",
    to: "pagado",
    roles: [ROL_TESORERIA],
    label: "Registrar el pago y reponer la caja",
  },
  devolver_contabilidad: {
    from: "pendiente_contabilidad",
    to: "borrador",
    roles: [ROL_CONTABILIDAD],
    requiereMotivo: true,
    label: "Devolver (falta soporte o registro adecuado)",
  },
};

/** A quién se le notifica cuando el reembolso llega a cada estado (el que sigue actuando). */
export const CAJA_MENOR_NOTIFICAR_AL_LLEGAR: Record<
  CajaMenorEstado,
  string[] | "creador"
> = {
  borrador: "creador",
  pendiente_director: [...ROLES_DIRECTOR_PROYECTO],
  pendiente_gerente: [ROL_GERENTE_PROYECTO],
  pendiente_contabilidad: [ROL_CONTABILIDAD],
  pendiente_pago: [ROL_TESORERIA],
  pagado: "creador",
};

/**
 * El arqueo de la caja, tal como está impreso en el recuadro del formato:
 *
 *   Monto fijo = Facturas y recibos + Anticipos por legalizar + Saldo en efectivo
 *
 * «Facturas y recibos» es la suma de la tabla (el TOTAL REEMBOLSO) y «Saldo en
 * efectivo» sale despejando. Ninguno de los dos se digita.
 *
 * El saldo puede dar NEGATIVO y eso no es un error: pasa cuando se gastó por encima
 * del monto fijo, que en la práctica ocurre. Es un dato del reembolso, no una regla
 * que haya que hacer cumplir, así que no bloquea nada.
 */
export interface ArqueoCaja {
  /** Suma de la columna VALOR de la tabla. Es el TOTAL REEMBOLSO. */
  facturas: number;
  /** Vales provisionales por legalizar. */
  anticipos: number;
  /** Lo que debería quedar físicamente en la caja. */
  saldoEfectivo: number;
  /** True si se gastó por encima del monto fijo (saldo negativo). Informativo. */
  excedido: boolean;
}

const num = (v: unknown): number => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Recalcula el arqueo desde los datos del formato. Fuente única para UI y backend. */
export function arqueoDeCajaMenor(data: Record<string, any> | null): ArqueoCaja {
  const d = data ?? {};
  const facturas = (Array.isArray(d.items) ? d.items : []).reduce(
    (s: number, it: Record<string, any>) => s + num(it?.valor),
    0,
  );
  const anticipos = num(d.anticipos);
  const montoFijo = num(d.montoFijo);
  const saldoEfectivo = montoFijo - facturas - anticipos;
  return { facturas, anticipos, saldoEfectivo, excedido: saldoEfectivo < 0 };
}
