/**
 * IDs de permisos del sistema
 * Corresponde a la tabla `permisos` en la base de datos
 */
export const PERMISSION_IDS = {
  VER: 1,
  CREAR: 2,
  REVISAR: 3,
  APROBAR: 4,
  AUTORIZAR: 5,
  COTIZAR: 6,
  EXPORTAR: 7,
  VALIDAR: 8,
} as const;

/**
 * Nombres de permisos para uso en decoradores y validaciones
 */
export const PERMISSION_NAMES = {
  VER: 'Ver',
  CREAR: 'Crear',
  REVISAR: 'Revisar',
  APROBAR: 'Aprobar',
  AUTORIZAR: 'Autorizar',
  COTIZAR: 'Cotizar',
  EXPORTAR: 'Exportar',
  VALIDAR: 'Validar',
} as const;

export type PermissionId = (typeof PERMISSION_IDS)[keyof typeof PERMISSION_IDS];
export type PermissionName = (typeof PERMISSION_NAMES)[keyof typeof PERMISSION_NAMES];
