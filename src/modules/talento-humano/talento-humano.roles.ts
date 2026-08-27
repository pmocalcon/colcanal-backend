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

/**
 * Quién puede **mandarle la nómina a Financiera** una vez revisada.
 *
 * Más corto que `ROLES_TALENTO_HUMANO` a propósito: revisar la liquidación y autorizar
 * que se pague no son la misma responsabilidad, y este es el paso con el que sale la
 * plata. Analista Administrativo queda por fuera —diligencia y consulta, no autoriza—.
 */
export const ROLES_ENVIAR_NOMINA = [
  "Coordinador Talento Humano",
  "Director Financiero y Administrativo",
  "Gerencia",
  "Director PMO",
] as const;
