import * as fs from "fs";
import * as path from "path";
import { DataSource, In } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../entities/th-horas-extra-detalle.entity";
import { ThPersona } from "../entities/th-persona.entity";

/**
 * Carga las planillas de horas extras de un periodo desde la hoja NOVEDADES HORA de
 * «Prueba Nómina.xlsx».
 *
 *     npx ts-node src/database/scripts/import-horas-extras-nomina.ts <ruta-json> [--dry-run]
 *
 * En el Excel, NOVEDADES HORA es una hoja aparte que alguien copiaba a mano a las
 * columnas de H. EXTRAS y RN de NOVEDADES NÓMINA. Acá no se copia nada: las planillas
 * quedan en `th_horas_extras` y la pantalla de nómina las propone sola, igual que hace
 * con incapacidades y vacaciones. Lo que se digite a mano en la novedad sigue mandando.
 *
 * La carga reemplaza las planillas de ese mismo texto de periodo (`periodoTexto`), que
 * es lo único que este script escribe, así que correrlo dos veces con el mismo JSON deja
 * lo mismo. No toca planillas cargadas por otra vía ni de otros meses.
 *
 * La hoja no trae cédula, solo el nombre: se resuelve contra `th_personal` y lo que no
 * case de forma única sale por consola y no se carga —colgarle unas horas extras a un
 * homónimo es peor que no cargarlas—.
 */

interface PlanillaJson {
  nombre: string;
  horasMes: number;
  valorHora: number;
  totalHoras: number;
  totalLiquidacion: number;
  /** Horas por tipo, con los nombres de las columnas de `th_horas_extras_detalle`. */
  detalle: Record<string, number>;
}

interface Json {
  periodo: string;
  periodoTexto: string;
  planillas: PlanillaJson[];
  resumenHoja?: Record<string, { horasExtras: number; recargoNocturno: number }>;
}

const clave = (nombre: string | null): string =>
  (nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const cifra = (v: number | undefined): string | null =>
  v == null || v === 0 ? null : String(v);

async function importar() {
  const jsonPath = path.resolve(process.argv[2] ?? "");
  const dryRun = process.argv.includes("--dry-run");

  if (!jsonPath || !fs.existsSync(jsonPath)) {
    console.error(`❌ No existe ${jsonPath || "(ruta vacía)"}`);
    console.error("\nUso: npx ts-node src/database/scripts/import-horas-extras-nomina.ts <ruta-json> [--dry-run]");
    process.exit(1);
  }

  const datos = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Json;
  console.log(`📂 ${jsonPath}`);
  console.log(`   periodo ${datos.periodo} · "${datos.periodoTexto}"`);

  // Los bloques en cero son gente a la que se le revisó el mes y no le quedaron horas.
  // No hace falta guardarles una planilla vacía.
  const conHoras = datos.planillas.filter((p) => p.totalLiquidacion > 0);
  console.log(`   ${datos.planillas.length} bloques en la hoja, ${conHoras.length} con horas\n`);

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const personas = await ds.getRepository(ThPersona).find();
  const porNombre = new Map<string, ThPersona[]>();
  for (const p of personas) {
    const k = clave(p.nombre);
    porNombre.set(k, [...(porNombre.get(k) ?? []), p]);
  }

  const listas: { planilla: PlanillaJson; persona: ThPersona }[] = [];
  const sinPersona: PlanillaJson[] = [];

  for (const planilla of conHoras) {
    const candidatos = porNombre.get(clave(planilla.nombre)) ?? [];
    // Varios contratos de la misma cédula comparten identificación: para la planilla da
    // igual cuál, porque el servicio decide después a qué contrato se le carga.
    const cedulas = new Set(candidatos.map((c) => c.identificacion));
    if (cedulas.size !== 1) { sinPersona.push(planilla); continue; }
    listas.push({ planilla, persona: candidatos[0] });
  }

  for (const { planilla, persona } of listas) {
    const r = datos.resumenHoja?.[planilla.nombre];
    const esperado = r ? r.horasExtras + r.recargoNocturno : null;
    const marca =
      esperado != null && Math.abs(esperado - planilla.totalLiquidacion) > 0.01
        ? `  ⚠ el RESUMEN de la hoja dice ${esperado.toLocaleString("es-CO")}`
        : "";
    console.log(
      `   ${planilla.nombre.padEnd(34)} ${persona.identificacion.padStart(12)}  ` +
        `${planilla.totalLiquidacion.toLocaleString("es-CO").padStart(12)}  ` +
        `${JSON.stringify(planilla.detalle)}${marca}`,
    );
  }
  if (sinPersona.length) {
    console.log("\n⚠ sin persona única en th_personal (no se cargan):");
    for (const p of sinPersona) console.log(`   ${p.nombre}  ${p.totalLiquidacion}`);
  }

  if (dryRun) {
    console.log("\n🔍 --dry-run: no se escribió nada.");
    await ds.destroy();
    return;
  }

  await ds.transaction(async (manager) => {
    const previas = await manager.find(ThHorasExtra, { where: { periodo: datos.periodoTexto } });
    if (previas.length) {
      await manager.delete(ThHorasExtraDetalle, { horasExtraId: In(previas.map((p) => p.horasExtraId)) });
      await manager.delete(ThHorasExtra, { periodo: datos.periodoTexto });
      console.log(`\n🧹 ${previas.length} planillas anteriores de "${datos.periodoTexto}" reemplazadas.`);
    }

    for (const { planilla, persona } of listas) {
      const guardada = await manager.save(
        manager.create(ThHorasExtra, {
          identificacion: persona.identificacion,
          nombre: persona.nombre,
          cargo: persona.cargo ?? null,
          salario: persona.salario ?? null,
          periodo: datos.periodoTexto,
          valorHora: String(planilla.valorHora),
          totalHoras: String(planilla.totalHoras),
          totalLiquidacion: String(planilla.totalLiquidacion),
          observaciones: `Importado de la hoja NOVEDADES HORA (${planilla.horasMes} horas/mes).`,
        }),
      );
      // La hoja no lleva el día a día, solo el total de horas por tipo: queda un renglón
      // único sin fecha. Es lo que hay — inventarle fechas sería peor.
      await manager.save(
        manager.create(ThHorasExtraDetalle, {
          horasExtraId: guardada.horasExtraId,
          fecha: null,
          diurna: cifra(planilla.detalle.diurna),
          recargoNocturno: cifra(planilla.detalle.recargoNocturno),
          nocturna: cifra(planilla.detalle.nocturna),
          diurnaFestiva: cifra(planilla.detalle.diurnaFestiva),
          nocturnaFestiva: cifra(planilla.detalle.nocturnaFestiva),
          liquidacion: String(planilla.totalLiquidacion),
        }),
      );
    }
  });

  console.log(`\n✅ ${listas.length} planillas cargadas.`);
  await ds.destroy();
}

importar().catch((e) => { console.error(e); process.exit(1); });
