/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Historial de las solicitudes de Gestión del Conocimiento más recientes. */
async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  const filas = await ds.query(
    `SELECT s.solicitud_id, s.gestion, s.formato, s.estado, s.created_at,
            s.created_by, u.nombre AS creador, s.historial, s.data
       FROM gc_solicitudes s
       LEFT JOIN users u ON u.user_id = s.created_by
      WHERE s.gestion = 'juridica'
      ORDER BY s.solicitud_id DESC
      LIMIT 4`,
  );

  for (const f of filas) {
    const d = f.data ?? {};
    console.log(`\n══ solicitud ${f.solicitud_id} · ${f.formato} · estado: ${f.estado}`);
    console.log(`   creada  : ${f.created_at?.toISOString?.() ?? f.created_at}`
      + `  por ${f.creador ?? `usuario ${f.created_by ?? "?"}`}`);
    console.log(`   consec. : ${d.consecutivo ?? d.numero ?? "—"}`);
    const h = Array.isArray(f.historial) ? f.historial : [];
    console.log(`   historial: ${h.length} entradas`);
    for (const e of h) {
      console.log(
        `     ${String(e.fecha ?? "").slice(0, 19).padEnd(19)}`
        + `  estado=${String(e.estado ?? "—").padEnd(30)}`
        + `  accion=${String(e.accion ?? "—").padEnd(24)}`
        + `  ${e.userName ?? "—"}`
        + (e.motivo ? `  motivo="${e.motivo}"` : ""),
      );
    }
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
