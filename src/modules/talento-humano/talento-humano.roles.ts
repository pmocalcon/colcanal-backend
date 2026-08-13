/**
 * Quién entra a Talento Humano.
 *
 * Los nombres van literales y **no** desde `ROLE_NAMES`: esa constante tiene
 * `DIRECTOR_FINANCIERO: "Director Financiero"` y el rol real de la base se llama
 * «Director Financiero y Administrativo», así que usarla dejaría fuera justo al área
 * dueña del dato sin que nada fallara —el guard simplemente no encontraría coincidencia—.
 *
 * El PMO entra por su condición de comodín, como en el resto del sistema.
 */
export const ROLES_TALENTO_HUMANO = [
  "Coordinador Talento Humano",
  "Director Financiero y Administrativo",
  "Analista Administrativo",
  "Gerencia",
  "Director PMO",
  "Analista PMO",
] as const;
