import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThNovedadNomina } from "../entities/th-novedad-nomina.entity";
import { ThPersona } from "../entities/th-persona.entity";

/**
 * Carga las novedades de nómina de un periodo desde un JSON extraído del Excel
 * "Prueba Nómina.xlsx" (hoja NOVEDADES NÓMINA).
 *
 *     npx ts-node src/database/scripts/import-novedades-nomina.ts <ruta-json> [--dry-run]
 *
 * El JSON trae `{ periodo: "2026-07", novedades: [...] }`. A diferencia de la carga
 * inicial de talento humano, acá NO se vacía toda la tabla `th_novedades_nomina` —
 * solo se reemplazan las filas del periodo que trae el JSON, para no tocar otros
 * meses que ya se hayan diligenciado.
 *
 * Sale por consola qué identificaciones del Excel no tienen persona ACTIVA en
 * `th_personal`: esas filas igual se cargan (la novedad no depende de una FK), pero
 * no van a aparecer en la pantalla de Novedades hasta que la persona esté activa.
 */

interface NovedadJson {
  personaId: number;
  identificacion: string;
  nombre: string;
  diasTrabajados: number;
  bonificaciones: number | null;
  embargo: number | null;
  retencionFuente: number | null;
  serviciosGruporecordar: number | null;
  /**
   * Campos opcionales: la hoja NOVEDADES NÓMINA no los tiene, pero la hoja NÓMINA sí
   * trae algunos escritos a mano. Cuando vienen en el JSON pisan lo que propondría el
   * formato aprobado, que es justo lo que hace la novedad digitada en la pantalla.
   */
  vacacionesHabiles?: number | null;
  vacacionesNoHabiles?: number | null;
  incapacidadEmpresa?: number | null;
  incapacidadEmpleado?: number | null;
}

interface Json {
  periodo: string;
  novedades: NovedadJson[];
}

const numOrNull = (v: number | null): string | null => (v == null ? null : String(v));

async function importar() {
  const jsonPath = path.resolve(process.argv[2] ?? "");
  const dryRun = process.argv.includes("--dry-run");

  if (!jsonPath || !fs.existsSync(jsonPath)) {
    console.error(`❌ No existe ${jsonPath || "(ruta vacía)"}`);
    console.log(
      "\nUso: npx ts-node src/database/scripts/import-novedades-nomina.ts <ruta-json> [--dry-run]",
    );
    process.exit(1);
  }

  const datos = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Json;
  console.log(`📂 ${jsonPath}`);
  console.log(`   periodo     ${datos.periodo}`);
  console.log(`   novedades   ${datos.novedades.length}`);

  const dataSource = new DataSource({ ...dataSourceOptions, synchronize: false });
  await dataSource.initialize();

  try {
    // Se borran antes las filas del periodo, no después: si una columna nueva se vuelve
    // NOT NULL (como `persona_id`), el ALTER TABLE de más abajo falla mientras haya
    // filas viejas sin ese dato. Va por query builder, no DELETE crudo sin WHERE, para
    // que quede acotado al periodo — nunca un TRUNCATE de la tabla completa.
    if (!dryRun) {
      const borradas = await dataSource
        .createQueryBuilder()
        .delete()
        .from(ThNovedadNomina)
        .where("periodo = :periodo", { periodo: datos.periodo })
        .execute();
      console.log(`🗑️  th_novedades_nomina: ${borradas.affected ?? 0} fila(s) del periodo ${datos.periodo} borradas antes de recargar`);
    }

    // th_novedades_nomina es tabla nueva: puede que aún no exista en esta base, o que le
    // falte una columna nueva. Se crea/agrega solo lo que haga falta, sin tocar nada más
    // del esquema (mismo cuidado que import-talento-humano.ts: no sincronizar con el
    // dataSource completo).
    const { upQueries } = await dataSource.driver.createSchemaBuilder().log();
    const mias = upQueries.filter((q) => q.query.includes("th_novedades_nomina"));
    for (const q of mias) {
      console.log(`🔧 ${q.query}`);
      if (!dryRun) await dataSource.query(q.query, q.parameters as unknown[]);
    }

    const personaRepo = dataSource.getRepository(ThPersona);
    const activos = await personaRepo.find({ where: {}, select: ["identificacion", "estado"] });
    const idsActivos = new Set(activos.filter((p) => p.estado === "ACTIVO").map((p) => p.identificacion));

    const sinPersonaActiva = datos.novedades.filter((n) => !idsActivos.has(n.identificacion));
    if (sinPersonaActiva.length > 0) {
      console.log(`\n⚠️  ${sinPersonaActiva.length} identificación(es) del Excel sin persona ACTIVA en th_personal:`);
      for (const n of sinPersonaActiva) console.log(`     ${n.identificacion}  ${n.nombre}`);
    }

    if (dryRun) {
      console.log("\n🔍 --dry-run: no se escribe nada.");
      console.log("Muestra de la primera fila:", datos.novedades[0]);
      return;
    }

    const repo = dataSource.getRepository(ThNovedadNomina);
    await dataSource.transaction(async (manager) => {
      const repoTx = manager.getRepository(ThNovedadNomina);

      const filas = datos.novedades.map((n) =>
        repoTx.create({
          periodo: datos.periodo,
          personaId: n.personaId,
          identificacion: n.identificacion,
          nombre: n.nombre,
          diasTrabajados: n.diasTrabajados,
          bonificaciones: numOrNull(n.bonificaciones),
          embargo: numOrNull(n.embargo),
          retencionFuente: numOrNull(n.retencionFuente),
          serviciosGruporecordar: numOrNull(n.serviciosGruporecordar),
          vacacionesHabiles: numOrNull(n.vacacionesHabiles ?? null),
          vacacionesNoHabiles: numOrNull(n.vacacionesNoHabiles ?? null),
          incapacidadEmpresa: numOrNull(n.incapacidadEmpresa ?? null),
          incapacidadEmpleado: numOrNull(n.incapacidadEmpleado ?? null),
        }),
      );
      await repoTx.insert(filas);
      console.log(`\n✅ th_novedades_nomina (periodo ${datos.periodo}): ${filas.length} fila(s) insertadas`);
    });

    console.log(`\n🎉 Carga terminada. Total de filas en ${datos.periodo}: ${await repo.count({ where: { periodo: datos.periodo } })}`);
  } finally {
    await dataSource.destroy();
  }
}

importar().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
