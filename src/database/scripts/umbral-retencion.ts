/* SOLO LECTURA — desde qué devengado empieza a haber retención, según las deducciones. */
import { calcularRetencion, FICHA_RETENCION_VACIA, type FichaRetencion } from "../../modules/talento-humano/retencion-fuente";

const UVT = Number(process.argv[2] ?? 52374);
const cop = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

/** El primer devengado (en pasos de mil) al que le sale retención. */
function umbral(ficha: FichaRetencion, aportesPct: number): number {
  for (let d = 1_000_000; d <= 30_000_000; d += 1000) {
    const ap = d * aportesPct;
    // Los aportes van repartidos como los liquida la nómina; solo importa la suma.
    const r = calcularRetencion({ totalDevengado: d, salud: ap / 2, pension: ap / 2, fsp: 0 }, ficha, UVT);
    if (r.retencion > 0) return d;
  }
  return -1;
}

console.log(`UVT ${UVT.toLocaleString("es-CO")} · el impuesto arranca en 95 UVT = ${cop(95 * UVT)} de base gravable\n`);
console.log("Devengado mensual desde el que empieza a haber retención:\n");

const casos: Array<[string, FichaRetencion, number]> = [
  ["Sin ninguna deducción (aportes 8 %)", FICHA_RETENCION_VACIA(), 0.08],
  ["Sin deducciones, con FSP (aportes 9 %)", FICHA_RETENCION_VACIA(), 0.09],
  ["Con dependientes al 10 % del devengado",
    { ...FICHA_RETENCION_VACIA(), viviendaModo: "PORCENTAJE", viviendaPorcentaje: 10 }, 0.08],
];
for (const [nombre, ficha, pct] of casos) {
  const u = umbral(ficha, pct);
  console.log(`  ${nombre.padEnd(42)} ${u < 0 ? "no alcanza" : cop(u)}`);
}
