/**
 * Máquina de estados de la Solicitud de Préstamo (G. de talento humano, GTH-007-F).
 *
 * Los pasos son las tres firmas del papel —Empleado, Gerencia con el valor aprobado en el
 * bloque 3, y Dirección Administrativa y Financiera—, en el orden en que se recogen:
 *
 *   Borrador → Autorización de Gerencia → Firma de Dirección Administrativa → Aprobado
 *
 * **Gerencia va primero**: es quien decide si se presta y por cuánto, y ese valor es el
 * que Dirección Administrativa necesita para pactar el desembolso y las cuotas. Al revés
 * —como estaba— Administrativa fijaba cuotas sobre un valor que Gerencia todavía podía
 * recortar, y había que rehacerlas.
 *
 * Por lo mismo el préstamo nace en la cartera al final, con la firma de Administrativa, y
 * no al autorizar Gerencia: antes de las condiciones no hay cuota ni fecha que registrar.
 *
 * Los rechazos devuelven al borrador —no hay estado "rechazado"— para que el
 * empleado corrija y lo vuelva a enviar, igual que en el anticipo (GF-005-F).
 * El motivo queda en la bitácora.
 *
 * Los SLA están en días hábiles.
 */

export const PRESTAMO_ESTADOS = {
  borrador: { label: 'Borrador', sla: null as number | null },
  pendiente_gerencia: { label: 'Pendiente de autorización de Gerencia', sla: 2 },
  pendiente_administrativa: { label: 'Pendiente de firma de Dirección Administrativa', sla: 2 },
  aprobado: { label: 'Aprobado', sla: null as number | null },
} as const;

export type PrestamoEstado = keyof typeof PRESTAMO_ESTADOS;

/** Dirección Administrativa: el "Área Administrativa y Financiera" de la política del formato. */
export const ROL_ADMINISTRATIVA = 'Director Financiero y Administrativo';
/**
 * Gerencia: autoriza el préstamo y fija el valor aprobado del bloque 3.
 *
 * Va por rol y no por persona, como todo el sistema. Hoy el rol lo tienen dos usuarias,
 * así que cualquiera de las dos podría autorizar; si tiene que ser solo la Gerente, se
 * filtra por nombre como se hizo con el envío de la liquidación.
 */
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
    to: 'pendiente_gerencia',
    roles: [],
    soloCreador: true,
    label: 'Enviar a Gerencia',
  },
  aprobar_gerencia: {
    from: 'pendiente_gerencia',
    to: 'pendiente_administrativa',
    roles: [ROL_GERENCIA],
    label: 'Autorizar y pasar a Dirección Administrativa',
  },
  rechazar_gerencia: {
    from: 'pendiente_gerencia',
    to: 'borrador',
    roles: [ROL_GERENCIA],
    requiereMotivo: true,
    label: 'Rechazar la solicitud',
  },
  aprobar_administrativa: {
    from: 'pendiente_administrativa',
    to: 'aprobado',
    roles: [ROL_ADMINISTRATIVA],
    label: 'Firmar y aprobar el préstamo',
  },
  rechazar_administrativa: {
    from: 'pendiente_administrativa',
    to: 'borrador',
    roles: [ROL_ADMINISTRATIVA],
    requiereMotivo: true,
    label: 'Devolver al empleado',
  },
};

/**
 * A quién se le notifica cuando la solicitud llega a cada estado (el que sigue actuando).
 * 'creador' = el empleado que la diligenció.
 */
export const PRESTAMO_NOTIFICAR_AL_LLEGAR: Record<PrestamoEstado, string[] | 'creador'> = {
  borrador: 'creador',
  pendiente_gerencia: [ROL_GERENCIA],
  pendiente_administrativa: [ROL_ADMINISTRATIVA],
  aprobado: 'creador',
};

/**
 * A quién se le avisa **para que se entere**, aunque todavía no le toque actuar.
 *
 * Dirección Administrativa firma de última, pero enterarse solo cuando Gerencia ya
 * autorizó la deja con dos días de SLA para pactar un desembolso que no sabía que venía.
 * Con el aviso de entrada llega al turno con el caso ya visto.
 *
 * Va aparte de `PRESTAMO_NOTIFICAR_AL_LLEGAR` a propósito: el correo de quien debe actuar
 * pide entrar a continuar el trámite, y decirle eso a quien todavía no puede hacer nada
 * es mandarlo a una pantalla donde no hay botón. Son dos correos distintos.
 *
 * A quien ya le toca actuar en ese estado no se le manda la copia: recibiría dos correos
 * del mismo hecho.
 */
export const PRESTAMO_ENTERAR_AL_LLEGAR: Record<PrestamoEstado, string[]> = {
  borrador: [],
  pendiente_gerencia: [ROL_ADMINISTRATIVA],
  pendiente_administrativa: [],
  aprobado: [],
};
