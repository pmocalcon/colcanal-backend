/**
 * Partir el nombre de la ficha en apellidos y nombres, para los formatos.
 *
 * La ficha trae el nombre en una sola cadena, «APELLIDOS NOMBRES», y dónde termina lo uno
 * y empieza lo otro no se puede adivinar con certeza: «CASTILLO JORGE EDUARDO» es un
 * apellido y dos nombres, y «TOBON LOPEZ YOHANNA» son dos apellidos y un nombre. Las dos
 * tienen tres palabras.
 *
 * La ficha tiene además las casillas `apellidos` y `nombres`, pero **son las del archivo
 * del banco**, que pide nombres y *primer* apellido. Casi nunca cubren el nombre completo,
 * y a veces vienen con otra ortografía («YOHANA» contra «YOHANNA»). Antes, si no cubrían
 * el nombre entero, se descartaban y se adivinaba por el número de palabras; con tres
 * palabras eso daba «LOPEZ YOHANNA TOBON».
 *
 * Ahora se usan como pista, en tres pasos:
 *
 * 1. Si las casillas cubren exactamente el nombre, mandan ellas.
 * 2. Si no, pero los nombres guardados coinciden con las **últimas** palabras del nombre
 *    —y el apellido guardado con las primeras—, eso dice cuántas palabras son nombres.
 *    Lo que queda antes son apellidos. Se escribe con la ortografía de la ficha, no con
 *    la de la casilla del banco.
 * 3. Si no hay pista, se cuenta: cuatro palabras o más son dos apellidos; tres o menos,
 *    uno.
 */

/** Sin tildes y en mayúsculas, palabra por palabra. */
const palabrasDe = (v: string | null | undefined): string[] =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/** Distancia de edición, cortada: solo interesa saber si es 0, 1 o más. */
function distancia(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let previo = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = guardado;
    }
  }
  return fila[b.length];
}

/**
 * La misma palabra, admitiendo una letra de diferencia en las de cuatro o más letras.
 *
 * Es la ortografía que se cuela entre la ficha y la casilla del banco: YOHANA/YOHANNA,
 * SWAN/SWANN, GUTIEREZ/GUTIERREZ. En las cortas no se admite: «ANA» y «AN» no son la
 * misma persona.
 */
const parecidas = (a: string, b: string): boolean =>
  a === b || (Math.min(a.length, b.length) >= 4 && distancia(a, b) <= 1);

export function partirNombreDeFicha(
  nombre: string | null | undefined,
  apellidosGuardados: string | null | undefined,
  nombresGuardados: string | null | undefined,
): { apellidos: string; nombres: string } {
  const original = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  const palabras = palabrasDe(nombre);
  const ape = palabrasDe(apellidosGuardados);
  const nom = palabrasDe(nombresGuardados);

  // 1. Las casillas cubren el nombre: son la corrección que alguien hizo a mano.
  if (ape.length + nom.length > 0) {
    const a = [...palabras].sort();
    const b = [...ape, ...nom].sort();
    if (a.length === b.length && a.every((x, i) => x === b[i])) {
      return {
        apellidos: (apellidosGuardados ?? "").trim(),
        nombres: (nombresGuardados ?? "").trim(),
      };
    }
  }

  if (original.length === 0) return { apellidos: "", nombres: "" };
  if (original.length === 1) return { apellidos: original[0], nombres: "" };

  // 2. Las casillas del banco como pista de cuántas palabras son nombres.
  if (nom.length > 0 && nom.length < palabras.length) {
    const cola = palabras.slice(palabras.length - nom.length);
    const colaCoincide = cola.every((p, i) => parecidas(p, nom[i]));
    const cabezaCoincide =
      ape.length === 0 ||
      (ape.length < palabras.length - nom.length + 1 &&
        ape.every((p, i) => parecidas(palabras[i], p)));
    if (colaCoincide && cabezaCoincide) {
      const corte = original.length - nom.length;
      return {
        apellidos: original.slice(0, corte).join(" "),
        nombres: original.slice(corte).join(" "),
      };
    }
  }

  // 3. Sin pista, por el número de palabras.
  const cuantos = original.length >= 4 ? 2 : 1;
  return {
    apellidos: original.slice(0, cuantos).join(" "),
    nombres: original.slice(cuantos).join(" "),
  };
}
