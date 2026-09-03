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

/**
 * Una fecha escrita a mano → «AAAA-MM-DD», que es lo único que acepta una columna `date`.
 *
 * Los formatos donde el usuario teclea la fecha libremente —la planilla de horas extras,
 * por ejemplo— la guardan como se escribió: «01/07/2026». Postgres rechaza ese texto en
 * una columna `date` y el error sale como un 400 genérico, sin decir cuál campo fue.
 *
 * Devuelve null si no reconoce la fecha o si el día no existe («31/02»), en vez de
 * lanzar: perder la fecha de un renglón es malo, pero tumbar la aprobación de toda una
 * planilla por un renglón mal escrito es peor.
 */
export function fechaTextoAIso(texto: unknown): string | null {
  const t = String(texto ?? "").trim();
  if (!t) return null;

  // «2026-07-01» (ya viene bien) o «01/07/2026» y «01-07-2026», que es como se escribe acá.
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const latino = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t);
  if (!iso && !latino) return null;

  const [anio, mes, dia] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : [Number(latino![3]), Number(latino![2]), Number(latino![1])];

  // Se comprueba que el día exista de verdad: `Date` acepta el 31 de febrero y lo corre
  // al 3 de marzo, así que una fecha imposible entraría como otra distinta sin avisar.
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    return null;
  }
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
