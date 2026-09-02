/* SOLO LECTURA — contrasta el cálculo contra el ejemplo de Retencionindependiente2026.xls */
import { calcularRetencion, FICHA_RETENCION_VACIA } from "../../modules/talento-humano/retencion-fuente";

const UVT = 52374;
const d = calcularRetencion(
  { totalDevengado: 10001950, salud: 316078, pension: 316078, fsp: 79019.5 },
  { ...FICHA_RETENCION_VACIA(), viviendaModo: "FIJO", viviendaValor: 1679116, dependientes: 790195 },
  UVT,
);

const esperado: Array<[string, number, number]> = [
  ["Total ingresos no constitutivos", d.ingresosNoConstitutivos, 711175.5],
  ["Subtotal 1", d.subtotal1, 9291000],
  ["Total deducciones", d.totalDeducciones, 2469311],
  ["Subtotal 2", d.subtotal2, 6821689],
  ["Subtotal 3", d.subtotal3, 6821689],
  ["Renta exenta 25%", d.rentaExenta25, 1705000],
  ["Subtotal 4", d.subtotal4, 5116689],
  ["Deducciones y exentas del mes", d.deduccionesYExentas, 4174311],
  ["Limite 40%", d.limite40, 3716000],
  ["Base para retencion", d.baseGravable, 5575000],
  ["Base en UVT", Number(d.baseUvt.toFixed(6)), 106.445946],
  ["RETENCION", d.retencion, 114000],
];

let mal = 0;
for (const [etiqueta, calculado, hoja] of esperado) {
  const ok = Math.abs(calculado - hoja) < 0.01;
  if (!ok) mal++;
  console.log(`${ok ? "OK " : "MAL"}  ${etiqueta.padEnd(32)} calculado=${calculado}  hoja=${hoja}`);
}
console.log(mal === 0 ? "\nTodo coincide con la hoja del contador." : `\n${mal} diferencia(s).`);
