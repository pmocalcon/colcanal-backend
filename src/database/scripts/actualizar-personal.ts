/* Actualiza `th_personal` desde un listado en JSON.
 *
 *     npx ts-node src/database/scripts/actualizar-personal.ts <archivo.json>            (ensayo)
 *     npx ts-node src/database/scripts/actualizar-personal.ts <archivo.json> --aplicar  (escribe)
 *
 * SOLO ACTUALIZA. No inserta ni borra a nadie, a propósito:
 *
 *  - Que alguien falte en un Excel no prueba que se haya retirado; puede ser un
 *    listado parcial. Marcar bajas por omisión es irreversible y silencioso.
 *  - Insertar tampoco: una persona nueva merece revisarse a mano, no colarse por
 *    una fila de más en un archivo.
 *
 * Lo que no encaja se reporta y se deja quieto.
 *
 * La llave es identificacion + empresaProyecto + fechaIngreso, y no la cédula
 * sola: hay cuatro personas con varios contratos a la vez en empresas distintas
 * —Gloria Escalante, Silvia Garces, Gonzalo Garces y Mayiver Sarria—, cada uno
 * con su cargo y su salario. Emparejar por cédula sería escribirle a cualquiera
 * de los tres.
 */
import * as fs from "fs";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThPersona } from "../entities/th-persona.entity";

const CAMPOS = [
  "estado", "tipoContrato", "ubicacion", "operacionFge", "centroCosto",
  "tipoGasto", "nombre", "cargo", "area", "escalafon", "formacionProfesional",
  "salario", "auxilioTransporte", "auxilioRodamiento", "totalSalarios",
  "cargaPrestacionalPct", "cargaPrestacional", "costoTotal", "anioVigencia",
] as const;

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

const muestra = (v: unknown) => (v === null || v === undefined ? "(vacío)" : String(v));
const llave = (p: Record<string, any>) =>
  `${String(p.identificacion).trim()}|${p.empresaProyecto ?? ""}|${p.fechaIngreso ?? ""}`;

async function main() {
  const ruta = process.argv[2];
  const aplicar = process.argv.includes("--aplicar");
  if (!ruta) throw new Error("Falta la ruta del JSON.");

  const nuevos: Record<string, any>[] = JSON.parse(fs.readFileSync(ruta, "utf8"));

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  const repo = ds.getRepository(ThPersona);
  const actuales = await repo.find();

  console.log(aplicar ? "MODO: APLICANDO CAMBIOS\n" : "MODO: ENSAYO (no escribe nada)\n");
  console.log(`Archivo: ${nuevos.length}   Base: ${actuales.length}\n`);

  // La llave tiene que distinguir de los dos lados. Si no, se para.
  const dupsDe = (xs: Record<string, any>[]) => {
    const c = new Map<string, number>();
    for (const x of xs) c.set(llave(x), (c.get(llave(x)) ?? 0) + 1);
    return [...c].filter(([, n]) => n > 1).map(([k]) => k);
  };
  const dupArchivo = dupsDe(nuevos);
  const dupBase = dupsDe(actuales as any);
  if (dupArchivo.length || dupBase.length) {
    console.error("La llave no distingue; no se toca nada:");
    for (const k of [...dupArchivo, ...dupBase]) console.error("  " + k);
    await ds.destroy();
    process.exit(1);
  }

  const porLlave = new Map(actuales.map((a) => [llave(a as any), a]));

  const cambios: { fila: ThPersona; campos: string[]; valores: Record<string, any> }[] = [];
  const sinPareja: Record<string, any>[] = [];

  for (const n of nuevos) {
    const actual = porLlave.get(llave(n));
    if (!actual) { sinPareja.push(n); continue; }
    const difs = CAMPOS.filter((f) => !igual(f, n[f], (actual as any)[f]));
    if (difs.length) {
      cambios.push({
        fila: actual,
        campos: [...difs],
        valores: Object.fromEntries(difs.map((f) => [f, n[f] ?? null])),
      });
    }
  }

  const enLlaves = new Set(nuevos.map(llave));
  const noVienen = actuales.filter((a) => !enLlaves.has(llave(a as any)));

  for (const c of cambios) {
    console.log(`  ${c.fila.identificacion} · ${c.fila.nombre}`);
    for (const f of c.campos) {
      console.log(`      ${f.padEnd(22)} ${muestra((c.fila as any)[f]).padEnd(26)} ->  ${muestra(c.valores[f])}`);
    }
  }

  console.log(`\n${cambios.length} persona(s) a actualizar, ${cambios.reduce((s, c) => s + c.campos.length, 0)} campo(s).`);

  if (sinPareja.length) {
    console.log(`\nEn el archivo pero sin pareja en la base (NO se insertan): ${sinPareja.length}`);
    for (const p of sinPareja) console.log(`  ${p.identificacion} · ${p.nombre} · ${p.empresaProyecto ?? ""}`);
  }
  if (noVienen.length) {
    console.log(`\nEn la base y no en el archivo (NO se tocan): ${noVienen.length}`);
    for (const p of noVienen) console.log(`  ${p.identificacion} · ${p.nombre} · ${p.estado ?? ""}`);
  }

  if (!aplicar) {
    console.log("\nEnsayo. Para escribir, repetir con --aplicar.");
    await ds.destroy();
    return;
  }

  await ds.transaction(async (m) => {
    for (const c of cambios) {
      await m.update(ThPersona, { personaId: c.fila.personaId }, c.valores);
    }
  });
  console.log(`\nListo: ${cambios.length} fila(s) actualizada(s). Nadie insertado ni borrado.`);

  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
