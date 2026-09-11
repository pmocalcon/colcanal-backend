/**
 * Lo que el servidor acepta guardar de un contraste, comprobado.
 *
 *     npx ts-node src/database/scripts/probar-contraste.ts
 *
 * No toca la base: `normalizarBloque` es una función pura y se le puede pedir cuenta sin
 * levantar nada.
 *
 * Lo que se prueba no es el formato sino **qué se niega a guardar**. Esto escribe en el
 * jsonb del módulo, que se lee entero en cada carga: un bloque sin tope lo engorda para
 * siempre, y un cero donde debía ir un nulo hace que un mes sano se lea después como un
 * mes que no cuadró.
 */
import { normalizarBloque } from "../../modules/recurso-economico/recurso-economico.service";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

function main() {
  // ── Un bloque normal, como lo manda la pantalla ──
  const bueno = normalizarBloque({
    archivo: "dian_PS114.pdf",
    fuente: "pdf",
    referencia: "PS101",
    fecha: "2025-11-10",
    filas: [
      { key: "subtotal", label: "Subtotal facturado", sistema: 373781094, documento: 373781094 },
      { key: "timbre", label: "TIMBRE", sistema: null, documento: null },
    ],
    cuadra: true,
    avisos: ["La factura se emitió muy lejos del periodo."],
  });

  revisar("un bloque completo pasa entero",
    bueno?.archivo === "dian_PS114.pdf" && bueno?.referencia === "PS101"
      && bueno?.filas.length === 2 && bueno?.cuadra === true && bueno?.avisos.length === 1,
    `${bueno?.filas.length} renglones, ${bueno?.avisos.length} aviso(s)`);

  revisar("«no aplica» se guarda como nulo y no como cero",
    bueno?.filas[1].sistema === null && bueno?.filas[1].documento === null,
    "un cero acá diría que se retuvo cero, que es otra cosa");

  // ── Sin archivo no hay constancia ──
  revisar("un bloque sin archivo no se guarda",
    normalizarBloque({ cuadra: true, filas: [] }) === null,
    "una constancia sin decir de qué documento salió no prueba nada");
  revisar("un bloque vacío no se guarda",
    normalizarBloque(undefined) === null && normalizarBloque({}) === null,
    "null y {} se descartan igual");

  // ── `cuadra` solo es cierto si llega cierto ──
  for (const valor of ["true", 1, "sí", null, undefined]) {
    const b = normalizarBloque({ archivo: "x.pdf", cuadra: valor as unknown });
    revisar(`cuadra con ${JSON.stringify(valor)} queda en falso`,
      b?.cuadra === false,
      "solo el booleano true marca que cuadró: un texto no decide esto");
  }

  // ── Los topes ──
  const enorme = normalizarBloque({
    archivo: "a".repeat(500),
    fuente: "f".repeat(100),
    filas: Array.from({ length: 200 }, (_, i) => ({
      key: `k${i}`, label: "L".repeat(200), sistema: i, documento: i,
    })),
    avisos: Array.from({ length: 100 }, () => "z".repeat(1000)),
  });
  revisar("el nombre del archivo se corta",
    enorme?.archivo.length === 200, `${enorme?.archivo.length} caracteres`);
  revisar("los renglones se topan",
    enorme?.filas.length === 40, `${enorme?.filas.length} renglones de los 200 que llegaron`);
  revisar("las etiquetas se cortan",
    enorme?.filas[0].label.length === 80, `${enorme?.filas[0].label.length} caracteres`);
  revisar("los avisos se topan y se cortan",
    enorme?.avisos.length === 20 && enorme?.avisos[0].length === 400,
    `${enorme?.avisos.length} avisos de ${enorme?.avisos[0].length} caracteres`);

  // ── Lo que no es número no se inventa ──
  const raro = normalizarBloque({
    archivo: "x.pdf",
    filas: [
      { key: "a", label: "A", sistema: "1234", documento: "no es un número" },
      { key: "b", label: "B", sistema: "", documento: NaN },
    ],
  });
  revisar("un número en texto se acepta",
    raro?.filas[0].sistema === 1234, `${raro?.filas[0].sistema}`);
  revisar("lo que no es número queda en nulo, no en cero",
    raro?.filas[0].documento === null && raro?.filas[1].sistema === null
      && raro?.filas[1].documento === null,
    "un cero inventado se leería como una cifra de verdad");

  // ── Lo que no viene no rompe ──
  const minimo = normalizarBloque({ archivo: " factura.xml " });
  revisar("un bloque mínimo se normaliza sin romperse",
    minimo?.archivo === "factura.xml" && minimo?.fuente === "desconocida"
      && minimo?.referencia === null && minimo?.fecha === null
      && minimo?.filas.length === 0 && minimo?.avisos.length === 0,
    `fuente «${minimo?.fuente}», sin renglones`);

  // ── Lo que sobra no entra ──
  const conBasura = normalizarBloque({
    archivo: "x.pdf",
    // @ts-expect-error: se manda a propósito algo que el servidor no conoce.
    textoLeido: Array.from({ length: 500 }, () => "un renglón entero del OCR"),
  });
  revisar("lo que el servidor no conoce no se guarda",
    conBasura != null && !("textoLeido" in conBasura),
    "el texto del OCR se puede volver a ver cargando el archivo; el veredicto no");

  console.log(malo
    ? "\nHay algo mal en lo que se guarda del contraste."
    : "\nLo que se guarda del contraste está bien.");
  process.exit(malo ? 1 : 0);
}

main();
