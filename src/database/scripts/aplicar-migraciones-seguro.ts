/**
 * Corre las migraciones pendientes SIN dejar que TypeORM sincronice el esquema.
 *
 * `dataSourceOptions` trae `synchronize: true`, y `initialize()` lo obedece: usar
 * el CLI (`npm run migration:run`) contra produccion aplicaria de paso todo lo
 * que synchronize crea que falta —renombrar constraints, borrar FKs que ninguna
 * entidad declara—, que no es lo que uno pidio. Aqui se apaga y se corre solo la
 * migracion.
 *
 * Antes de aplicar imprime lo que synchronize HABRIA hecho, para dejar constancia
 * de la deriva sin ejecutarla.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  const { upQueries } = await ds.driver.createSchemaBuilder().log();
  console.log(`\n== Deriva de esquema que synchronize aplicaria (${upQueries.length}) ==`);
  console.log("   NO se ejecuta ninguna:");
  for (const q of upQueries) console.log(`   · ${q.query}`);

  const pendientes = await ds.showMigrations();
  if (!pendientes) {
    console.log("\n== No hay migraciones pendientes ==");
    await ds.destroy();
    return;
  }

  // Sin `--aplicar` no escribe: primero se mira, despues se aplica.
  if (!process.argv.includes("--aplicar")) {
    console.log("\n== Hay migraciones pendientes. Correr con --aplicar para ejecutarlas ==");
    await ds.destroy();
    return;
  }

  console.log("\n== Aplicando migraciones pendientes ==");
  const corridas = await ds.runMigrations({ transaction: "each" });
  for (const m of corridas) console.log(`   ✔ ${m.name}`);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
