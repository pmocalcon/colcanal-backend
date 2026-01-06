/**
 * Nombres de roles del sistema
 */
export const ROLE_NAMES = {
  GERENCIA: 'Gerencia',
  GERENCIA_PROYECTOS: 'Gerencia de Proyectos',
  DIRECTOR_TICS: 'Director TICs',
  DIRECTOR_PMO: 'Director PMO',
  DIRECTOR_TECNICO: 'Director Técnico',
  DIRECTOR_FINANCIERO: 'Director Financiero',
  DIRECTOR_COMERCIAL: 'Director Comercial',
  DIRECTOR_JURIDICO: 'Director Jurídico',
  DIRECTOR_PROYECTO: 'Director de Proyecto',
  ANALISTA_TICS: 'Analista TICs',
  ANALISTA_PMO: 'Analista PMO',
  COORDINADOR_FINANCIERO: 'Coordinador Financiero',
  COORDINADOR_JURIDICO: 'Coordinador Jurídico',
  COORDINADOR_OPERATIVO: 'Coordinador Operativo',
  COMPRAS: 'Compras',
  PQRS: 'PQRS',
} as const;

/**
 * Slugs de roles (nombres normalizados en minúsculas)
 */
export const ROLE_SLUGS = {
  GERENCIA: 'gerencia',
  GERENCIA_PROYECTOS: 'gerencia de proyectos',
  DIRECTOR_TICS: 'director tics',
  DIRECTOR_PMO: 'director pmo',
  ANALISTA_TICS: 'analista tics',
  ANALISTA_PMO: 'analista pmo',
  COMPRAS: 'compras',
  PQRS: 'pqrs',
} as const;

/**
 * Categorías de roles
 */
export const ROLE_CATEGORIES = {
  ADMINISTRATIVO: 'Administrativo',
  COMPRAS: 'Compras',
  PMO: 'PMO',
  TICS: 'TICs',
  GERENCIA: 'Gerencia',
  OPERATIVO: 'Operativo',
  PQRS: 'PQRS',
} as const;

/**
 * Roles permitidos para administrar usuarios
 */
export const USER_ADMIN_ALLOWED_ROLES = [
  ROLE_SLUGS.DIRECTOR_TICS,
  ROLE_SLUGS.ANALISTA_TICS,
  ROLE_SLUGS.DIRECTOR_PMO,
  ROLE_SLUGS.ANALISTA_PMO,
  ROLE_SLUGS.GERENCIA,
] as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];
export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];
export type RoleCategory = (typeof ROLE_CATEGORIES)[keyof typeof ROLE_CATEGORIES];
