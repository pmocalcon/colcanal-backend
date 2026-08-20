/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Todas las acciones que existen en las bitácoras, para que ninguna quede sin rótulo. */
async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  const filas = await ds.query(
    `SELECT s.gestion,
            e->>'accion' AS accion,
            e->>'estado' AS estado,
            COUNT(*) AS veces
       FROM gc_solicitudes s,
            LATERAL jsonb_array_elements(COALESCE(s.historial, '[]'::jsonb)) e
      GROUP BY s.gestion, e->>'accion', e->>'estado'
      ORDER BY s.gestion, accion, estado`,
  );

  let gestion = "";
  for (const f of filas) {
    if (f.gestion !== gestion) {
      gestion = f.gestion;
      console.log(`\n══ ${gestion}`);
    }
    console.log(
      `   ${String(f.accion).padEnd(30)} → ${String(f.estado).padEnd(32)} ${f.veces}x`,
    );
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
