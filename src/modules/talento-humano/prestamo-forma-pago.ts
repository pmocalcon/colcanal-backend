/**
 * Cómo se cobra un préstamo: por nómina o por fuera de ella.
 *
 * Vive acá y no junto a la entidad porque el índice de entidades usa `export *`, y todo
 * lo que se exporte desde un archivo de entidad termina en la lista que recibe TypeORM
 * como si fuera una tabla. Una constante colada ahí es un error de arranque esperando.
 */

/** Las dos formas de cobrar un préstamo. */
export const FORMA_PAGO_PRESTAMO = { NOMINA: "NOMINA", DIRECTO: "DIRECTO" } as const;

export type FormaPagoPrestamo =
  (typeof FORMA_PAGO_PRESTAMO)[keyof typeof FORMA_PAGO_PRESTAMO];

/**
 * Si este préstamo se cobra por fuera de la nómina.
 *
 * La pregunta se hace acá y no comparando cadenas en cada sitio, porque hay que
 * acordarse de que **el nulo es nómina**: quien lo olvide sacaría de la liquidación
 * todos los préstamos viejos de una sola vez, que son todos los que hay hoy.
 */
export const esPagoDirecto = (p: { formaPago?: string | null }): boolean =>
  (p.formaPago ?? "").trim().toUpperCase() === FORMA_PAGO_PRESTAMO.DIRECTO;
