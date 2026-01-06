/**
 * Códigos de estado de orden de compra
 * Corresponde a la tabla `purchase_order_statuses` en la base de datos
 */
export const PURCHASE_ORDER_STATUS = {
  PENDIENTE_APROBACION: 'pendiente_aprobacion',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
  ENVIADA_PROVEEDOR: 'enviada_proveedor',
  CONFIRMADA_PROVEEDOR: 'confirmada_proveedor',
  EN_TRANSITO: 'en_transito',
  RECIBIDA_PARCIAL: 'recibida_parcial',
  RECIBIDA_TOTAL: 'recibida_total',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
} as const;

export type PurchaseOrderStatusCode = (typeof PURCHASE_ORDER_STATUS)[keyof typeof PURCHASE_ORDER_STATUS];
