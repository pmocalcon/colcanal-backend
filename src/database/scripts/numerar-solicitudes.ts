import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Crea la columna del consecutivo y numera las solicitudes que ya existen.
 *
 *     npx ts-node src/database/scripts/numerar-solicitudes.ts [--aplicar]
 *
 * Sin `--aplicar` solo muestra qué número le quedaría a cada una, sin escribir.
 *
 * El número se reparte **por formato** y en orden de creación, que es el orden en que se
 * habrían gastado si el consecutivo hubiera existido desde el principio. Los borradores
 * quedan sin número a propósito: todavía no son documentos.
 *
 * Es idempotente: solo toca las filas que tienen `numero` en nulo, así que correrlo dos
 * veces no renumera nada.
 */
async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  await ds.query(`ALTER TABLE gc_solicitudes ADD COLUMN IF NOT EXISTS numero INT`);

  const pendientes = await ds.query(
    `SELECT solicitud_id, gestion, formato, estado, created_at
     FROM gc_solicitudes
     WHERE numero IS NULL AND estado <> 'borrador'
     ORDER BY formato, created_at, solicitud_id`,
  );

  // Desde dónde sigue cada formato, por si ya hay algunos numerados.
  const maximos = new Map<string, number>();
  for (const f of await ds.query(
    `SELECT coalesce(formato, '') AS formato, coalesce(max(numero), 0) AS maximo
     FROM gc_solicitudes GROUP BY 1`,
  )) {
    maximos.set(f.formato, Number(f.maximo));
  }

  const plan: Array<{ id: number; formato: string; numero: number; estado: string }> = [];
  for (const s of pendientes) {
    const clave = s.formato ?? "";
    const siguiente = (maximos.get(clave) ?? 0) + 1;
    maximos.set(clave, siguiente);
    plan.push({ id: s.solicitud_id, formato: clave, numero: siguiente, estado: s.estado });
  }

  console.log(aplicar ? "NUMERANDO:" : "SIMULACIÓN (usa --aplicar para escribir):");
  for (const p of plan) {
    console.log(`  ${p.formato} · solicitud_id ${p.id} (${p.estado}) -> N.º ${p.numero}`);
  }
  const borradores = await ds.query(
    `SELECT count(*) FROM gc_solicitudes WHERE numero IS NULL AND estado = 'borrador'`,
  );
  console.log(`  ${borradores[0].count} borrador(es) quedan sin número, como corresponde.`);

  if (aplicar) {
    for (const p of plan) {
      await ds.query(`UPDATE gc_solicitudes SET numero = $1 WHERE solicitud_id = $2`, [
        p.numero,
        p.id,
      ]);
    }
    /*
     * El índice único es la red que evita dos documentos con el mismo número si dos
     * solicitudes salen de borrador a la vez. Se crea después de numerar: si los datos
     * traían un duplicado, es preferible que falle acá —con todo a la vista— y no en
     * mitad de un trámite.
     */
    await ds.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS gc_solicitudes_formato_numero_uq
       ON gc_solicitudes (formato, numero) WHERE numero IS NOT NULL`,
    );
    console.log("Índice único (formato, numero) listo.");
  }

  console.log("ESTADO FINAL:", JSON.stringify(
    await ds.query(
      `SELECT formato, numero, solicitud_id, estado
       FROM gc_solicitudes ORDER BY formato, numero NULLS LAST, solicitud_id`,
    ),
  ));

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
