import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThPersona } from "../entities/th-persona.entity";
import { ThIncapacidad } from "../entities/th-incapacidad.entity";
import { ThAusentismo } from "../entities/th-ausentismo.entity";

/**
 * Carga inicial de talento humano desde el JSON que produce
 * `scripts/extraer-talento-humano.py`.
 *
 *     python scripts/extraer-talento-humano.py .. talento-humano.json
 *     npx ts-node src/database/scripts/import-talento-humano.ts talento-humano.json
 *
 * Es una carga **de una sola vez**: de acá en adelante la información se vive en el
 * sistema y los Excel dejan de ser la fuente.
 *
 * Por eso el script es reejecutable pero no acumulativo: cada tabla se vacía antes de
 * llenarla. Insertar encima sin vaciar duplicaría todo el histórico al segundo intento,
 * y no hay llave natural con la que deduplicar —una persona puede tener dos permisos el
 * mismo día por el mismo motivo, y sería un registro válido, no un duplicado—.
 *
 * `--dry-run` recorre y cuenta sin escribir nada.
 */

interface Json {
  personal: Record<string, unknown>[];
  incapacidades: Record<string, unknown>[];
  ausentismos: Record<string, unknown>[];
}

/** Las tres tablas de este módulo. Nada de lo que haga el script sale de acá. */
const TABLAS_TH = ["th_personal", "th_incapacidades", "th_ausentismos"];

/**
 * Crea las tablas del módulo que falten, y **solo esas**.
 *
 * El `dataSource` del proyecto viene con `synchronize: true`, así que conectarse con él
 * dispara una sincronización de todo el esquema contra la base de producción: renombra
 * constraints y borra llaves foráneas que no estén declaradas en alguna entidad. Eso lo
 * puede querer alguien arrancando el backend, pero no un script de carga de datos.
 *
 * Entonces se conecta con la sincronización apagada, se le pregunta a TypeORM qué SQL
 * *habría* corrido (`.log()`, que no ejecuta nada), y se ejecuta únicamente lo que toca
 * las tablas `th_*`. El resto se imprime para que se vea qué hay pendiente, sin correrlo.
 */
async function crearTablasDelModulo(ds: DataSource): Promise<void> {
  const { upQueries } = await ds.driver.createSchemaBuilder().log();
  if (upQueries.length === 0) return;

  const mias = upQueries.filter((q) => TABLAS_TH.some((t) => q.query.includes(t)));
  const ajenas = upQueries.filter((q) => !TABLAS_TH.some((t) => q.query.includes(t)));

  for (const q of mias) {
    console.log(`🔧 ${q.query}`);
    await ds.query(q.query, q.parameters as unknown[]);
  }

  if (ajenas.length > 0) {
    console.log(
      `\n⚠️  El esquema tiene ${ajenas.length} cambio(s) pendientes fuera de talento humano.`,
    );
    console.log("   NO se ejecutaron. Los va a aplicar el backend al arrancar:");
    for (const q of ajenas.slice(0, 15)) console.log(`     ${q.query}`);
    if (ajenas.length > 15) console.log(`     … y ${ajenas.length - 15} más`);
    console.log("");
  }
}

/** Postgres no acepta `''` en una columna `date` ni en una `numeric`. */
function limpiar(fila: Record<string, unknown>): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fila)) {
    salida[k] = v === "" || v === undefined ? null : v;
  }
  return salida;
}

async function importar() {
  const jsonPath = path.resolve(
    process.argv[2] ?? path.join(process.cwd(), "talento-humano.json"),
  );
  const dryRun = process.argv.includes("--dry-run");

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ No existe ${jsonPath}`);
    console.log(
      "\nUso: npx ts-node src/database/scripts/import-talento-humano.ts <ruta-json> [--dry-run]",
    );
    console.log("\nEl JSON lo genera:");
    console.log("  python scripts/extraer-talento-humano.py .. talento-humano.json");
    process.exit(1);
  }

  const datos = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Json;

  console.log(`📂 ${jsonPath}`);
  console.log(`   personal       ${datos.personal?.length ?? 0}`);
  console.log(`   incapacidades  ${datos.incapacidades?.length ?? 0}`);
  console.log(`   ausentismos    ${datos.ausentismos?.length ?? 0}`);

  if (dryRun) {
    console.log("\n🔍 --dry-run: no se escribe nada.");
    console.log("Muestra del primer registro de cada tabla:");
    for (const k of ["personal", "incapacidades", "ausentismos"] as const) {
      const primera = datos[k]?.[0];
      if (primera) console.log(`\n${k}:`, limpiar(primera));
    }
    return;
  }

  const dataSource = new DataSource({ ...dataSourceOptions, synchronize: false });
  await dataSource.initialize();

  try {
    await crearTablasDelModulo(dataSource);

    await dataSource.transaction(async (manager) => {
      const tablas = [
        { entidad: ThPersona, filas: datos.personal ?? [], nombre: "th_personal" },
        { entidad: ThIncapacidad, filas: datos.incapacidades ?? [], nombre: "th_incapacidades" },
        { entidad: ThAusentismo, filas: datos.ausentismos ?? [], nombre: "th_ausentismos" },
      ];

      for (const { entidad, filas, nombre } of tablas) {
        if (filas.length === 0) {
          console.log(`⏭️  ${nombre}: el JSON no trae filas, se deja como está`);
          continue;
        }

        const repo = manager.getRepository(entidad);
        const antes = await repo.count();

        // DELETE y no `clear()`: `clear()` hace TRUNCATE, que en Postgres es DDL y se
        // sale de la transacción, así que un fallo más adelante ya no se podría deshacer.
        // Va por query builder porque `delete({})` lo rechaza TypeORM: no admite criterio
        // vacío, justamente para que nadie borre una tabla entera sin querer.
        await manager.createQueryBuilder().delete().from(entidad).execute();

        // De a 200: un solo INSERT con cientos de filas se pasa del límite de
        // parámetros de Postgres y explota con un error que no dice por qué.
        for (let i = 0; i < filas.length; i += 200) {
          await repo.insert(filas.slice(i, i + 200).map(limpiar) as never);
        }

        console.log(`✅ ${nombre}: ${antes} → ${filas.length}`);
      }
    });

    console.log("\n🎉 Carga terminada.");
  } catch (error) {
    console.error("\n❌ Falló la carga, no se escribió nada:", error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

void importar();
