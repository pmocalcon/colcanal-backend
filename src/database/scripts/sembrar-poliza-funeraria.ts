import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThPersona } from "../entities/th-persona.entity";
import { ThNovedadNomina } from "../entities/th-novedad-nomina.entity";

/**
 * Crea la columna `poliza_funeraria` en `th_personal` y la siembra con lo que ya se
 * descontó por «SERVICIOS GRUPORECORDAR» en un periodo.
 *
 *     npx ts-node src/database/scripts/sembrar-poliza-funeraria.ts [periodo] [--dry-run]
 *     npx ts-node src/database/scripts/sembrar-poliza-funeraria.ts 2026-07
 *
 * La cuota de la póliza es la misma todos los meses, así que hasta ahora había que
 * volver a digitarla en la novedad de cada periodo. Con el campo en la ficha, la nómina
 * la propone sola y solo se digita cuando hay que corregirla.
 *
 * No pisa lo que ya tenga valor: sirve para arrancar, no para reescribir.
 *
 * El ALTER va explícito y no por `synchronize`, para no arrastrar de paso cualquier otro
 * cambio pendiente del esquema en una tabla que está en producción.
 */
async function main() {
  const periodo = process.argv.find((a) => /^\d{4}-\d{2}$/.test(a)) ?? "2026-07";
  const dryRun = process.argv.includes("--dry-run");

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const existe = await ds.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'th_personal' AND column_name = 'poliza_funeraria'`,
  );
  if (existe.length === 0) {
    console.log("🔧 ALTER TABLE th_personal ADD COLUMN poliza_funeraria numeric(14,2)");
    if (!dryRun) {
      await ds.query(`ALTER TABLE "th_personal" ADD COLUMN "poliza_funeraria" numeric(14,2)`);
    }
  } else {
    console.log("✔ la columna poliza_funeraria ya existe");
  }

  if (dryRun && existe.length === 0) {
    console.log("\n🔍 --dry-run: sin la columna no se puede sembrar. Corre sin --dry-run.");
    await ds.destroy();
    return;
  }

  const novedades = await ds.getRepository(ThNovedadNomina).find({ where: { periodo } });
  const personas = await ds.getRepository(ThPersona).find();
  const porId = new Map(personas.map((p) => [p.personaId, p]));

  const aSembrar: { persona: ThPersona; cuota: string }[] = [];
  const yaTenian: string[] = [];
  for (const n of novedades) {
    const cuota = Number(n.serviciosGruporecordar ?? 0);
    const persona = porId.get(n.personaId);
    if (!persona || cuota <= 0) continue;
    if (Number(persona.polizaFuneraria ?? 0) > 0) {
      yaTenian.push(persona.nombre);
      continue;
    }
    aSembrar.push({ persona, cuota: String(cuota) });
  }

  console.log(`\nperiodo ${periodo}: ${novedades.length} novedades`);
  console.log(`${aSembrar.length} personas con cuota por sembrar` +
    (yaTenian.length ? `, ${yaTenian.length} que ya tenían valor (no se tocan)` : ""));
  for (const { persona, cuota } of aSembrar) {
    console.log(`   ${persona.nombre.padEnd(36)} ${Number(cuota).toLocaleString("es-CO").padStart(10)}`);
  }
  const total = aSembrar.reduce((s, x) => s + Number(x.cuota), 0);
  console.log(`   ${"total".padEnd(36)} ${total.toLocaleString("es-CO").padStart(10)}`);

  if (dryRun) {
    console.log("\n🔍 --dry-run: no se sembró nada.");
    await ds.destroy();
    return;
  }

  await ds.transaction(async (manager) => {
    for (const { persona, cuota } of aSembrar) {
      await manager.update(ThPersona, persona.personaId, { polizaFuneraria: cuota });
    }
  });
  console.log(`\n✅ ${aSembrar.length} fichas actualizadas.`);
  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
