/* SOLO LECTURA — la fecha guardada tiene que ser la misma que se escribió. */
import { fechaLocal, hoyLocal } from "../../utils/fecha-local.util";

/** Lo que TypeORM escribe en una columna `date`: los componentes LOCALES. */
const comoLoGuardaTypeorm = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// 2028 es bisiesto; 2026 no, así que su 29 de febrero no existe y no sirve de caso.
const casos = ["2026-07-24", "2026-01-01", "2026-12-31", "2028-02-29", "2026-08-27"];
let mal = 0;

console.log(`Zona horaria del proceso: UTC${-new Date().getTimezoneOffset() / 60}\n`);
console.log("escrito       antes (new Date)   ahora (fechaLocal)");
for (const t of casos) {
  const antes = comoLoGuardaTypeorm(new Date(t));
  const ahora = comoLoGuardaTypeorm(fechaLocal(t));
  const ok = ahora === t;
  if (!ok) mal++;
  console.log(`${t}    ${antes}${antes === t ? "  " : " *"}       ${ahora}  ${ok ? "OK" : "MAL"}`);
}

const hoy = new Date();
const esperado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
const okHoy = comoLoGuardaTypeorm(hoyLocal()) === esperado;
if (!okHoy) mal++;
console.log(`\nhoyLocal() -> ${comoLoGuardaTypeorm(hoyLocal())}  (hoy es ${esperado})  ${okHoy ? "OK" : "MAL"}`);
console.log(mal === 0 ? "\nTodas las fechas se guardan con el día que se escribió." : `\n${mal} fallo(s).`);
