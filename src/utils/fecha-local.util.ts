/**
 * Fechas de calendario («AAAA-MM-DD») que no se pueden correr un día.
 *
 * `new Date("2026-07-24")` NO devuelve el 24 de julio: devuelve la **medianoche UTC**
 * de ese día, que en Bogotá es el **23 a las 7 de la noche**. Y TypeORM escribe las
 * columnas `date` con los componentes LOCALES de la fecha —`getFullYear`, `getMonth`,
 * `getDate`—, así que termina guardando «2026-07-23».
 *
 * El error no se nota nunca: no falla, no avisa, y la fecha guardada es perfectamente
 * plausible. Así se emitieron 318 de las 319 órdenes de compra con la fecha del día
 * anterior al que realmente se generaron.
 *
 * Solo aplica a fechas de CALENDARIO —la fecha de emisión de una orden, la de una
 * factura, la de un levantamiento—, que son un día del almanaque y no un instante.
 * Para los instantes (`timestamptz`: creado, actualizado, cuándo se envió un correo)
 * `new Date()` está bien y no hay que tocar nada.
 */

/** «2026-07-24» → el 24 de julio a la medianoche LOCAL, que es lo que se guarda. */
export function fechaLocal(texto: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(texto ?? "").trim());
  if (!m) {
    // Otro formato: se deja al parser de siempre. Es preferible a devolver una fecha
    // inventada, porque el valor raro se ve y una fecha silenciosamente equivocada no.
    return new Date(texto);
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Igual que el anterior, pero tolera nulos: devuelve null en vez de una fecha inválida. */
export const fechaLocalOpcional = (texto?: string | null): Date | null =>
  texto ? fechaLocal(texto) : null;

/** Hoy, como día del calendario. `new Date()` ya es local, así que sirve tal cual. */
export const hoyLocal = (): Date => {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
};
