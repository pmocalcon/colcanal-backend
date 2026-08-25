import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThPersona } from "../entities/th-persona.entity";

/**
 * Rellena `th_personal.nivel_riesgo` (tarifa ARL) desde un JSON extraído de la tabla
 * "Colaboradores" del Excel de nómina — esa columna no se trajo en la carga inicial de
 * personal y ahora hace falta para mostrarla en Novedades Nómina.
 *
 *     npx ts-node src/database/scripts/import-nivel-riesgo.ts <ruta-json> [--dry-run]
 *
 * El JSON es `[{ identificacion, riesgo, estado }]`. Actualiza por identificación —
 * si hay varias personas activas con la misma cédula (contrato en varias empresas del
 * grupo), les pone la misma tarifa a todas, porque la tabla fuente no distingue por
 * proyecto.
 */

interface Fila {
  identificacion: string;
  riesgo: number | null;
  estado: string | null;
}

async function importar() {
  const jsonPath = path.resolve(process.argv[2] ?? "");
  const dryRun = process.argv.includes("--dry-run");

  if (!jsonPath || !fs.existsSync(jsonPath)) {
    console.error(`❌ No existe ${jsonPath || "(ruta vacía)"}`);
    console.log("\nUso: npx ts-node src/database/scripts/import-nivel-riesgo.ts <ruta-json> [--dry-run]");
    process.exit(1);
  }

  const filas = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Fila[];
  const conRiesgo = filas.filter((f) => f.riesgo != null);
  console.log(`📂 ${jsonPath}`);
  console.log(`   filas en el JSON     ${filas.length}`);
  console.log(`   con nivel de riesgo  ${conRiesgo.length}`);

  const dataSource = new DataSource({ ...dataSourceOptions, synchronize: false });
  await dataSource.initialize();

  try {
    const { upQueries } = await dataSource.driver.createSchemaBuilder().log();
    const mias = upQueries.filter((q) => q.query.includes("th_personal"));
    for (const q of mias) {
      console.log(`🔧 ${q.query}`);
      if (!dryRun) await dataSource.query(q.query, q.parameters as unknown[]);
    }

    const repo = dataSource.getRepository(ThPersona);
    const identificacionesDb = new Set((await repo.find({ select: ["identificacion"] })).map((p) => p.identificacion));
    const sinPersona = conRiesgo.filter((f) => !identificacionesDb.has(f.identificacion));
    if (sinPersona.length > 0) {
      console.log(`\n⚠️  ${sinPersona.length} identificación(es) del Excel sin persona en th_personal:`);
      for (const f of sinPersona) console.log(`     ${f.identificacion}`);
    }

    if (dryRun) {
      console.log("\n🔍 --dry-run: no se escribe nada.");
      return;
    }

    let actualizadas = 0;
    for (const f of conRiesgo) {
      const r = await repo.update({ identificacion: f.identificacion }, { nivelRiesgo: String(f.riesgo) });
      actualizadas += r.affected ?? 0;
    }
    console.log(`\n✅ th_personal.nivel_riesgo: ${actualizadas} fila(s) actualizadas`);
  } finally {
    await dataSource.destroy();
  }
}

importar().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
