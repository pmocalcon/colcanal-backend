/* SOLO LECTURA — compara un listado de personal en JSON contra `th_personal`.
   No escribe absolutamente nada: solo dice qué cambiaría.

     npx ts-node src/database/scripts/comparar-personal.ts <archivo.json>
*/
import * as fs from "fs";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThPersona } from "../entities/th-persona.entity";

/** Campos que se comparan. Los de auditoría y el id quedan fuera. */
const CAMPOS = [
  "estado", "tipoContrato", "ubicacion", "empresaProyecto", "identificacion",
  "operacionFge", "centroCosto", "tipoGasto", "nombre", "cargo", "area",
  "fechaIngreso", "escalafon", "formacionProfesional",
  "salario", "auxilioTransporte", "auxilioRodamiento", "totalSalarios",
  "cargaPrestacionalPct", "cargaPrestacional", "costoTotal", "anioVigencia",
] as const;

/** Los numéricos vuelven de Postgres como texto ("5500000.00"). Se comparan por valor. */
const NUMERICOS = new Set([
  "salario", "auxilioTransporte", "auxilioRodamiento", "totalSalarios",
  "cargaPrestacionalPct", "cargaPrestacional", "costoTotal", "anioVigencia",
]);

const igual = (campo: string, a: unknown, b: unknown): boolean => {
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  if (NUMERICOS.has(campo)) return Math.abs(Number(a) - Number(b)) < 0.005;
  return String(a).trim() === String(b).trim();
};

const muestra = (v: unknown) => (v === null || v === undefined ? "—" : String(v));

async function main() {
  const ruta = process.argv[2];
  if (!ruta) throw new Error("Falta la ruta del JSON.");
  const nuevos: Record<string, any>[] = JSON.parse(fs.readFileSync(ruta, "utf8"));

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  const actuales = await ds.getRepository(ThPersona).find();

  console.log(`Archivo: ${nuevos.length} personas   Base: ${actuales.length} registros\n`);

  const porCedula = (xs: Record<string, any>[]) => {
    const m = new Map<string, Record<string, any>[]>();
    for (const x of xs) {
      const k = String(x.identificacion).trim();
      (m.get(k) ?? m.set(k, []).get(k)!).push(x);
    }
    return m;
  };

  const mapNuevos = porCedula(nuevos as any);
  const mapActuales = porCedula(actuales as any);

  const repetidas = [...mapNuevos].filter(([, v]) => v.length > 1);
  if (repetidas.length) {
    console.log("CÉDULAS REPETIDAS EN EL ARCHIVO (se comparan por nombre):");
    for (const [c, v] of repetidas) console.log(`  ${c}: ${v.map((x: any) => x.nombre).join(" | ")}`);
    console.log();
  }

  const altas = [...mapNuevos.keys()].filter((c) => !mapActuales.has(c));
  const bajas = [...mapActuales.keys()].filter((c) => !mapNuevos.has(c));

  console.log(`=== PERSONAS NUEVAS (en el archivo, no en la base): ${altas.length} ===`);
  for (const c of altas) {
    for (const p of mapNuevos.get(c)!) {
      console.log(`  + ${c.padEnd(12)} ${String(p.nombre).padEnd(38)} ${p.estado ?? ""} · ${p.cargo ?? ""}`);
    }
  }

  console.log(`\n=== EN LA BASE PERO NO EN EL ARCHIVO: ${bajas.length} ===`);
  for (const c of bajas) {
    for (const p of mapActuales.get(c)!) {
      console.log(`  - ${c.padEnd(12)} ${String(p.nombre).padEnd(38)} ${p.estado ?? ""} · ${p.cargo ?? ""}`);
    }
  }

  console.log(`\n=== CAMBIOS EN QUIENES YA ESTÁN ===`);
  let conCambios = 0;
  let totalCambios = 0;
  const porCampo = new Map<string, number>();

  for (const [c, listaNueva] of mapNuevos) {
    const listaActual = mapActuales.get(c);
    if (!listaActual) continue;
    // Con cédula repetida se empareja por posición; se avisó arriba.
    for (let i = 0; i < Math.min(listaNueva.length, listaActual.length); i++) {
      const n = listaNueva[i] as any;
      const a = listaActual[i] as any;
      const difs = CAMPOS.filter((f) => !igual(f, n[f], a[f]));
      if (!difs.length) continue;
      conCambios++;
      totalCambios += difs.length;
      console.log(`\n  ${c} · ${a.nombre}`);
      for (const f of difs) {
        porCampo.set(f, (porCampo.get(f) ?? 0) + 1);
        console.log(`      ${f.padEnd(22)} ${muestra(a[f]).padEnd(28)} ->  ${muestra(n[f])}`);
      }
    }
  }

  console.log(`\n${conCambios} persona(s) con cambios, ${totalCambios} campo(s) en total.`);
  if (porCampo.size) {
    console.log("\nCampos que más cambian:");
    for (const [f, n] of [...porCampo].sort((x, y) => y[1] - x[1])) {
      console.log(`  ${String(n).padStart(3)}  ${f}`);
    }
  }

  console.log("\n(Nada de esto se escribió. Es solo la comparación.)");
  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
