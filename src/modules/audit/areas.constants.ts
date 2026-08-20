/**
 * A qué área pertenece cada rol, para saber qué área compra más.
 *
 * La base no tiene columna de área: `users` guarda cargo y rol, y el cargo es
 * texto libre —hay «coordinador talento humano» en minúsculas y dos personas
 * llamadas igual—. El rol sí es dato estable, así que la agrupación va por
 * `rol_id` y no por el nombre, que alguien puede renombrar sin avisar.
 *
 * Es una decisión de negocio, no técnica: si Compras debe contar dentro de
 * Financiera y Administrativa, o si los PQRS deben separarse por municipio en
 * vez de ir juntos, se cambia aquí y en un solo sitio.
 */
export const AREA_POR_ROL: Record<number, string> = {
  // Proyectos: la gerencia, los cuatro directores regionales, los diez PQRS de
  // los municipios y la coordinación operativa. Los PQRS y Operativa van aquí
  // por decisión del negocio —compran para la operación de los proyectos, no
  // para un área propia—, y juntos son la mayor parte de la compra.
  2: 'Proyectos',
  8: 'Proyectos',
  9: 'Proyectos',
  10: 'Proyectos',
  11: 'Proyectos',
  32: 'Proyectos',
  18: 'Proyectos',
  19: 'Proyectos',
  20: 'Proyectos',
  21: 'Proyectos',
  22: 'Proyectos',
  23: 'Proyectos',
  24: 'Proyectos',
  25: 'Proyectos',
  26: 'Proyectos',
  27: 'Proyectos',

  3: 'PMO',
  12: 'PMO',

  4: 'Comercial',
  13: 'Comercial',

  6: 'Técnica',

  // Administrativa entra aquí porque el cargo que la encabeza es «Director
  // Financiero y Administrativo»: son la misma dirección.
  7: 'Financiera y Administrativa',
  15: 'Financiera y Administrativa',
  16: 'Financiera y Administrativa',

  14: 'Jurídica',
  17: 'Jurídica',

  28: 'Compras',
  30: 'TIC',
  31: 'TIC',
  34: 'Talento Humano',
  36: 'SST',
};

/**
 * El área de un rol. Los roles que no estén en el mapa caen en «Otras» en vez de
 * desaparecer: un rol nuevo tiene que notarse, no perderse del total.
 */
export const areaDeRol = (rolId: number | null | undefined): string =>
  (rolId != null && AREA_POR_ROL[rolId]) || 'Otras';
