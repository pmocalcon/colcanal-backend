/**
 * Quién ve cuáles solicitudes en Gestión del conocimiento.
 *
 * Antes el listado devolvía **todas** las solicitudes a cualquiera que entrara: un
 * director de proyecto que pedía un contrato veía también los de los demás, con nombre del
 * contratista y valor. Eso no era una decisión, era que el filtro `mine` existía pero
 * quedaba en manos del navegador, y un filtro que el cliente decide no restringe nada.
 *
 * La regla queda acá y la aplica el servidor.
 */

/**
 * Las áreas que tramitan o firman, y por eso ven todo el listado: Jurídica,
 * Administrativa, Financiera, Gerencia y el PMO.
 *
 * Gerencia de Proyectos **no** está acá: firma dentro del trámite pero su alcance no es
 * todo el listado sino lo que piden los proyectos. Ver `ALCANCE_POR_ROL`.
 *
 * Los nombres van literales y **no** desde `ROLE_NAMES`: esa constante tiene
 * `DIRECTOR_FINANCIERO: "Director Financiero"` y el rol real de la base se llama
 * «Director Financiero y Administrativo», así que usarla dejaría fuera justo al área
 * dueña del trámite sin que nada fallara.
 */
export const ROLES_VEN_TODAS: readonly string[] = [
  // Jurídica: genera y revisa el contrato.
  "Director Jurídico",
  "Coordinador Jurídico",
  "Analista Jurídico",
  // Administrativa: tramita la RQ y sus documentos.
  "Director Financiero y Administrativo",
  "Analista Administrativo",
  // Financiera: paga y legaliza.
  "Coordinador Financiero",
  "Contabilidad",
  // Gerencia firma el contrato.
  "Gerencia",
  // El comodín transversal.
  "Analista PMO",
  "Director PMO",
];

export const veTodasLasSolicitudes = (nombreRol?: string | null): boolean =>
  ROLES_VEN_TODAS.includes((nombreRol ?? "").trim());

/**
 * Roles cuyo alcance no es «todas» ni «solo las mías», sino «las de cierta gente».
 *
 * Gerencia de Proyectos autoriza la contratación que piden los proyectos, y esa es toda
 * su parte: no tiene por qué ver la que tramita Administrativa para sí misma ni la de
 * áreas que no son suyas. Se define por **rol y no por persona** a propósito: la
 * condición es del cargo, así que si mañana lo ocupa alguien más, la regla lo sigue sin
 * que haya que acordarse de venir acá.
 *
 * La llave es el rol de quien mira; la lista, los roles de quienes crean.
 */
export const ALCANCE_POR_ROL: Record<string, readonly string[]> = {
  "Gerencia de Proyectos": [
    "Director de Proyecto Antioquia",
    "Director de Proyecto Putumayo",
    "Director de Proyecto Quindío",
    "Director de Proyecto Valle",
    "Director Técnico",
  ],
};

/** Los roles cuyas solicitudes alcanza a ver quien tiene este rol, o `null` si no aplica. */
export const alcanceDe = (nombreRol?: string | null): readonly string[] | null =>
  ALCANCE_POR_ROL[(nombreRol ?? "").trim()] ?? null;
