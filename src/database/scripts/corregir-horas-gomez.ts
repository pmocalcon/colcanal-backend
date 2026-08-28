import { DataSource, ILike } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../entities/th-horas-extra-detalle.entity";

/**
 * Corrección puntual de la planilla de horas extras de GOMEZ MONTOYA RUBEN DARIO
 * (cédula 70419913) en julio 2026.
 *
 *     npx ts-node -r tsconfig-paths/register src/database/scripts/corregir-horas-gomez.ts [--apply]
 *
 * La hoja NOVEDADES HORA se digitó con HED=5 y HDDYF vacío; lo real es HED=7,5 y HDDYF=6.
 * El sistema importó fielmente lo que traía el Excel, así que no hay error de cálculo: hay
 * que corregir el dato. No existe pantalla ni endpoint para editar el detalle por tipo, de
 * ahí este script.
 *
 * Recalcula la liquidación con los mismos factores del Excel (HED 1,25 · HEN 1,75 ·
 * HDDYF 1,8) sobre el `valorHora` que ya tiene guardado la planilla, para quedar
 * consistente con el resto del periodo. Idempotente: correrlo dos veces deja lo mismo.
 * Aborta si no encuentra exactamente una planilla suya en julio 2026.
 */

const IDENTIFICACION = "70419913";
const PERIODO_LIKE = "%julio%2026%";

/** Horas reales por tipo y su factor (los del Excel). Lo no listado va en cero. */
const NUEVAS_HORAS = {
  diurna: { horas: 7.5, factor: 1.25 },
  nocturna: { horas: 0.5, factor: 1.75 },
  recargoNocturno: { horas: 6, factor: 0.35 },
  diurnaFestiva: { horas: 0, factor: 1.8 },
  nocturnaFestiva: { horas: 0, factor: 2.15 },
} as const;

const cifra = (v: number): string | null => (v === 0 ? null : String(v));

async function main() {
  const apply = process.argv.includes("--apply");

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const planillas = await ds.getRepository(ThHorasExtra).find({
    where: { identificacion: IDENTIFICACION, periodo: ILike(PERIODO_LIKE) },
  });

  if (planillas.length !== 1) {
    console.error(
      `❌ Se esperaba 1 planilla de ${IDENTIFICACION} en julio 2026, hay ${planillas.length}. No se toca nada.`,
    );
    await ds.destroy();
    process.exit(1);
  }
  const planilla = planillas[0];

  const detalles = await ds.getRepository(ThHorasExtraDetalle).find({
    where: { horasExtraId: planilla.horasExtraId },
  });
  if (detalles.length !== 1) {
    console.error(
      `❌ Se esperaba 1 renglón de detalle, hay ${detalles.length}. No se toca nada.`,
    );
    await ds.destroy();
    process.exit(1);
  }
  const detalle = detalles[0];

  const valorHora = Number(planilla.valorHora);
  const totalHoras = Object.values(NUEVAS_HORAS).reduce((s, x) => s + x.horas, 0);
  const totalLiquidacion = Object.values(NUEVAS_HORAS).reduce(
    (s, x) => s + x.horas * x.factor * valorHora,
    0,
  );
  const liqRedondeada = totalLiquidacion.toFixed(2);

  console.log(`📋 Planilla ${planilla.horasExtraId} · ${planilla.nombre} · "${planilla.periodo}"`);
  console.log(`   valorHora  ${valorHora.toLocaleString("es-CO")}`);
  const linea = (d: { diurna: string | null; recargoNocturno: string | null; nocturna: string | null; diurnaFestiva: string | null }) =>
    `     HED ${d.diurna ?? "—"} · RN ${d.recargoNocturno ?? "—"} · HEN ${d.nocturna ?? "—"} · HDDYF ${d.diurnaFestiva ?? "—"}`;
  console.log("\n   ANTES:");
  console.log(linea(detalle));
  console.log(`     totalHoras ${planilla.totalHoras} · totalLiquidacion ${Number(planilla.totalLiquidacion).toLocaleString("es-CO")}`);
  console.log("\n   DESPUÉS:");
  console.log(`     HED ${NUEVAS_HORAS.diurna.horas} · RN ${NUEVAS_HORAS.recargoNocturno.horas} · HEN ${NUEVAS_HORAS.nocturna.horas} · HDDYF ${NUEVAS_HORAS.diurnaFestiva.horas || "—"}`);
  console.log(`     totalHoras ${totalHoras} · totalLiquidacion ${Number(liqRedondeada).toLocaleString("es-CO")}`);

  if (!apply) {
    console.log("\n🔍 dry-run: no se escribió nada. Corre con --apply para aplicar.");
    await ds.destroy();
    return;
  }

  await ds.transaction(async (manager) => {
    await manager.update(ThHorasExtraDetalle, { detalleId: detalle.detalleId }, {
      diurna: cifra(NUEVAS_HORAS.diurna.horas),
      nocturna: cifra(NUEVAS_HORAS.nocturna.horas),
      recargoNocturno: cifra(NUEVAS_HORAS.recargoNocturno.horas),
      diurnaFestiva: cifra(NUEVAS_HORAS.diurnaFestiva.horas),
      nocturnaFestiva: cifra(NUEVAS_HORAS.nocturnaFestiva.horas),
      liquidacion: liqRedondeada,
    });
    await manager.update(ThHorasExtra, { horasExtraId: planilla.horasExtraId }, {
      totalHoras: String(totalHoras),
      totalLiquidacion: liqRedondeada,
    });
  });

  console.log("\n✅ Planilla corregida.");
  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
