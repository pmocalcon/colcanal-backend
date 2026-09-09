/**
 * Anulación de los formatos de Talento Humano (préstamo, permiso, vacaciones y horas
 * extras).
 *
 * No es un paso más de cada flujo sino un camino transversal, y por eso vive aparte: se
 * puede tomar desde **cualquier** estado, incluido el aprobado. Meterlo en las tablas de
 * transiciones —que van de un estado concreto a otro— habría obligado a escribir una
 * entrada por cada estado de cada formato.
 *
 *   cualquier estado ──solicitar_anulacion──▶ pendiente_anulacion ──anular──▶ anulado
 *          └──────────────anular (Talento Humano)──────────────────────────────┘
 *   pendiente_anulacion ──rechazar_anulacion──▶ vuelve al estado en que estaba
 *
 * **Anular un formato ya aprobado deshace lo que dejó en nómina.** Los cuatro crean un
 * registro real al aprobarse —un préstamo, un ausentismo, una planilla, unas vacaciones—
 * y ese registro es el que la liquidación lee. Cambiar solo el estado del documento
 * dejaría a la nómina pagando o descontando algo que ya nadie autorizó, sin que nada
 * avise. Por eso el registro se borra: es un derivado, y la historia completa —con su
 * motivo y su bitácora— queda en el documento anulado.
 */

import { ROLES_TALENTO_HUMANO } from "../talento-humano/talento-humano.roles";

export const ANULACION_ESTADOS = {
  pendiente_anulacion: {
    label: "Pendiente de aprobación de la anulación",
    sla: 1 as number | null,
  },
  anulado: { label: "Anulado", sla: null as number | null },
} as const;

export type AnulacionEstado = keyof typeof ANULACION_ESTADOS;

/**
 * Quién anula sin pedirle permiso a nadie.
 *
 * Talento Humano, que es quien responde por lo que entra a nómina, y el PMO, que pasa
 * por encima de cualquier paso. Cualquier otro —el empleado que ya no quiere el
 * préstamo, el jefe que canceló el permiso— **solicita** la anulación y la resuelve
 * Talento Humano. Es el mismo reparto que en las requisiciones de Compras.
 */
export const ROLES_ANULAN: readonly string[] = ["Coordinador Talento Humano"];

/** Los formatos que admiten anulación. */
export const FORMATOS_ANULABLES: readonly string[] = [
  "GTH-007-F", // Solicitud de préstamo
  "GTH-009-F", // Solicitud de permiso
  "GTH-016-F", // Horas extras
  "GTH-018-F", // Solicitud de vacaciones
  "GTH-002-F", // Trámite de contratación
];

/**
 * Quién anula, cuando no es Talento Humano.
 *
 * El trámite de contratación no pasa por nómina sino por la Dirección Administrativa y
 * Financiera, que es la que autoriza contratar y por tanto la que puede desautorizarlo.
 * El PMO va aparte, como en todo: pasa por encima de cualquier paso.
 */
const ANULAN_POR_FORMATO: Record<string, readonly string[]> = {
  "GTH-002-F": ["Director Financiero y Administrativo"],
};

/** Los roles que anulan ese formato directamente. El PMO no se lista: siempre puede. */
export const rolesQueAnulan = (formato: string): readonly string[] =>
  ANULAN_POR_FORMATO[formato] ?? ROLES_ANULAN;

/** Cómo nombrar a esos roles en un mensaje de error, que lo lee una persona. */
export const quienAnula = (formato: string): string =>
  formato === "GTH-002-F" ? "la Dirección Administrativa y Financiera" : "Talento Humano";

/**
 * Formatos cuya anulación no se pide: se toma.
 *
 * En los de Talento Humano el empleado o su jefe pueden **pedir** la anulación y la
 * resuelve Talento Humano, porque son ellos los afectados. En el trámite de contratación
 * no: quien puede anularlo lo anula, y no hay nadie más a quien pedírselo. Dejar abierto
 * el pedido crearía un `pendiente_anulacion` sin bandeja donde resolverlo —una solicitud
 * atascada en un estado sin salida—.
 */
export const ANULACION_SIN_SOLICITUD: readonly string[] = ["GTH-002-F"];

export const ACCIONES_ANULACION = [
  "solicitar_anulacion",
  "anular",
  "rechazar_anulacion",
] as const;

export type AccionAnulacion = (typeof ACCIONES_ANULACION)[number];

export const esAccionDeAnulacion = (accion: string): accion is AccionAnulacion =>
  (ACCIONES_ANULACION as readonly string[]).includes(accion);

/**
 * Dónde se guarda el estado al que hay que volver si la anulación se rechaza.
 *
 * Se guarda en `data` y no se deduce del historial: el historial se puede haber quedado
 * corto —las solicitudes viejas nacieron sin él— y devolver la solicitud a un estado
 * adivinado es peor que no tener el botón.
 */
export const CAMPO_ESTADO_PREVIO = "estadoAntesDeAnulacion";

/** Las firmas de la anulación, para que el impreso diga quién y cuándo. */
export const CAMPO_ANULACION = {
  solicitadaPor: "anulacionSolicitadaPor",
  solicitadaFecha: "anulacionSolicitadaFecha",
  motivo: "anulacionMotivo",
  anuladaPor: "anuladaPor",
  anuladaFecha: "anuladaFecha",
} as const;

/** True si el estado ya no admite ningún paso del flujo normal. */
export const estaAnulado = (estado: string): boolean => estado === "anulado";

/**
 * Roles que ven la bandeja de anulaciones pendientes. Es el mismo conjunto que puede
 * resolverlas, más el resto de Talento Humano para que la vean venir.
 */
export const ROLES_VEN_ANULACIONES: readonly string[] = ROLES_TALENTO_HUMANO;
