/**
 * Códigos de estado de requisición
 * Corresponde a la tabla `requisition_statuses` en la base de datos
 */
export const REQUISITION_STATUS = {
  PENDIENTE_VALIDACION: 'pendiente_validacion',
  PENDIENTE: 'pendiente',
  EN_REVISION: 'en_revision',
  APROBADA_REVISOR: 'aprobada_revisor',
  PENDIENTE_AUTORIZACION: 'pendiente_autorizacion',
  AUTORIZADO: 'autorizado',
  APROBADA_GERENCIA: 'aprobada_gerencia',
  EN_COTIZACION: 'en_cotizacion',
  RECHAZADA_VALIDADOR: 'rechazada_validador',
  RECHAZADA_REVISOR: 'rechazada_revisor',
  RECHAZADA_AUTORIZADOR: 'rechazada_autorizador',
  RECHAZADA_GERENCIA: 'rechazada_gerencia',
  COTIZADA: 'cotizada',
  EN_ORDEN_COMPRA: 'en_orden_compra',
  PENDIENTE_RECEPCION: 'pendiente_recepcion',
  COMPLETADA: 'completada',
} as const;

/**
 * Estados que permiten edición de la requisición
 */
export const EDITABLE_STATUSES = [
  REQUISITION_STATUS.PENDIENTE,
  REQUISITION_STATUS.RECHAZADA_VALIDADOR,
  REQUISITION_STATUS.RECHAZADA_REVISOR,
  REQUISITION_STATUS.RECHAZADA_AUTORIZADOR,
  REQUISITION_STATUS.RECHAZADA_GERENCIA,
] as const;

/**
 * Estados que indican rechazo
 */
export const REJECTED_STATUSES = [
  REQUISITION_STATUS.RECHAZADA_VALIDADOR,
  REQUISITION_STATUS.RECHAZADA_REVISOR,
  REQUISITION_STATUS.RECHAZADA_AUTORIZADOR,
  REQUISITION_STATUS.RECHAZADA_GERENCIA,
] as const;

/**
 * Estados válidos para aprobar por gerencia
 */
export const APPROVABLE_BY_MANAGEMENT_STATUSES = [
  REQUISITION_STATUS.PENDIENTE,
  REQUISITION_STATUS.APROBADA_REVISOR,
  REQUISITION_STATUS.AUTORIZADO,
] as const;

export type RequisitionStatusCode = (typeof REQUISITION_STATUS)[keyof typeof REQUISITION_STATUS];
