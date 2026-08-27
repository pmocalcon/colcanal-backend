/**
 * Nombres de roles del sistema
 */
export const ROLE_NAMES = {
  GERENCIA: "Gerencia",
  GERENCIA_PROYECTOS: "Gerencia de Proyectos",
  DIRECTOR_TICS: "Director TICs",
  DIRECTOR_PMO: "Director PMO",
  DIRECTOR_TECNICO: "Director Técnico",
  DIRECTOR_FINANCIERO: "Director Financiero",
  DIRECTOR_COMERCIAL: "Director Comercial",
  DIRECTOR_JURIDICO: "Director Jurídico",
  DIRECTOR_PROYECTO: "Director de Proyecto",
  ANALISTA_TICS: "Analista TICs",
  ANALISTA_PMO: "Analista PMO",
  COORDINADOR_FINANCIERO: "Coordinador Financiero",
  COORDINADOR_JURIDICO: "Coordinador Jurídico",
  COORDINADOR_OPERATIVO: "Coordinador Operativo",
  COMPRAS: "Compras",
  PQRS: "PQRS",
} as const;

/**
 * Slugs de roles (nombres normalizados en minúsculas)
 */
export const ROLE_SLUGS = {
  GERENCIA: "gerencia",
  GERENCIA_PROYECTOS: "gerencia de proyectos",
  DIRECTOR_TICS: "director tics",
  DIRECTOR_PMO: "director pmo",
  ANALISTA_TICS: "analista tics",
  ANALISTA_PMO: "analista pmo",
  COMPRAS: "compras",
  PQRS: "pqrs",
} as const;

/**
 * Categorías de roles
 */
export const ROLE_CATEGORIES = {
  ADMINISTRATIVO: "Administrativo",
  COMPRAS: "Compras",
  PMO: "PMO",
  TICS: "TICs",
  GERENCIA: "Gerencia",
  OPERATIVO: "Operativo",
  PQRS: "PQRS",
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

/**
 * El PMO es el comodín transversal del sistema: puede ejecutar cualquier paso
 * de un flujo sin importar a qué área le corresponda. El Director y el Analista
 * tienen exactamente el mismo alcance, así que los flujos preguntan por el
 * grupo y no por un nombre suelto.
 */
export const ROLES_PMO: readonly string[] = [
  ROLE_NAMES.ANALISTA_PMO,
  ROLE_NAMES.DIRECTOR_PMO,
];

export const esRolPmo = (nombreRol?: string | null): boolean =>
  ROLES_PMO.includes((nombreRol ?? "").trim());

/**
 * Los directores de proyecto, uno por regional.
 *
 * Van escritos completos y **no** desde `ROLE_NAMES.DIRECTOR_PROYECTO`: esa constante
 * dice «Director de Proyecto» a secas y en la base no existe ningún rol con ese nombre
 * —son cuatro, cada uno con su regional al final—. Usarla dejaría a los cuatro por fuera
 * sin que nada fallara: el guard simplemente no encontraría coincidencia.
 */
export const ROLES_DIRECTOR_PROYECTO: readonly string[] = [
  "Director de Proyecto Antioquia",
  "Director de Proyecto Putumayo",
  "Director de Proyecto Quindío",
  "Director de Proyecto Valle",
];

/**
 * Quién entra a Factura de concesión.
 *
 * El PMO la diligencia y los directores de proyecto la **validan**: antes de que la
 * factura quede guardada, el director del municipio digita su valor contra la factura
 * física que tiene en la mano. Sin este acceso el validador no sería de ellos, que es
 * justo el punto: quien revisa no puede ser el mismo que digitó las cifras.
 */
export const ROLES_FACTURA: readonly string[] = [
  ...ROLES_PMO,
  ...ROLES_DIRECTOR_PROYECTO,
];

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];
export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];
export type RoleCategory =
  (typeof ROLE_CATEGORIES)[keyof typeof ROLE_CATEGORIES];
