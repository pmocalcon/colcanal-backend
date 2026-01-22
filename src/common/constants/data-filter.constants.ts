/**
 * Constantes para filtrado de datos
 *
 * Los datos creados antes de OFFICIAL_DATA_START_DATE son considerados datos de prueba
 * y deben ser excluidos de las vistas de la aplicación.
 */

// Fecha a partir de la cual los datos son oficiales (7 de enero de 2026)
// Los datos del 6 de enero y anteriores son considerados datos de prueba
export const OFFICIAL_DATA_START_DATE = new Date('2026-01-07T00:00:00.000Z');
