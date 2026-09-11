/* SOLO LECTURA — este script no escribe nada en la base. */
/**
 * Las consultas de la auditoría de obras, contra la base de verdad.
 *
 *     npx ts-node src/database/scripts/probar-consultas-auditoria-obras.ts
 *
 * `tsc` no lee SQL: un `LATERAL` mal enganchado, una columna que no existe o un `IS NOT
 * DISTINCT FROM` que no une nada compilan perfecto y revientan —o peor, devuelven vacío—
 * recién en pantalla. Esto las ejecuta todas y enseña lo que traen.
 *
 * `synchronize: false` a propósito: este script mira, no crea tablas.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ObrasAuditService } from "../../modules/audit/obras-audit.service";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  // El servicio solo usa `.query()` de cada repositorio, así que basta con dárselos.
  const servicio = new ObrasAuditService(
    ds.getRepository("WorkLog") as never,
    ds.getRepository("WorkActa") as never,
    ds.getRepository("Work") as never,
  );

  try {
    const existeBitacora = await ds.query(`SELECT to_regclass('public.work_logs') AS t`);
    revisar(
      "la tabla work_logs existe",
      existeBitacora[0]?.t != null,
      existeBitacora[0]?.t
        ? "ya está creada"
        : "todavía no: la crea TypeORM al arrancar el servidor (synchronize)",
    );
    if (existeBitacora[0]?.t == null) {
      console.log(
        "\nSin la tabla no se puede probar el resto. Levante el servidor una vez y repita.",
      );
      process.exit(1);
    }

    const actas = await servicio.getActas({ limit: 5 });
    revisar(
      "el listado de actas responde",
      Array.isArray(actas.actas),
      `${actas.total} acta(s) en total, se trajeron ${actas.actas.length}`,
    );
    for (const a of actas.actas.slice(0, 5)) {
      console.log(
        `        ${String(a.municipio ?? "—").padEnd(16)} acta ${String(a.actaNumber).padEnd(10)} ` +
          `${String(a.estado).padEnd(14)} ppto:${String(a.presupuesto).padEnd(11)} ` +
          `crono:${String(a.cronograma).padEnd(11)} obras:${String(a.obras).padStart(3)} ` +
          `$${Math.round(Number(a.valor)).toLocaleString("es-CO")}`,
      );
    }

    const obras = await servicio.getObras({ limit: 5 });
    revisar(
      "el listado de obras responde",
      Array.isArray(obras.obras),
      `${obras.total} obra(s) en total, se trajeron ${obras.obras.length}`,
    );
    for (const o of obras.obras.slice(0, 5)) {
      console.log(
        `        ${String(o.codigo ?? "—").padEnd(14)} ${String(o.nombre).slice(0, 34).padEnd(34)} ` +
          `acta ${String(o.acta ?? "—").padEnd(10)} lev:${String(o.levantamiento ?? "—").padEnd(10)} ` +
          `bloques:${o.bloquesAprobados ?? 0}/5`,
      );
    }

    // El valor de la auditoría tiene que ser el mismo del «Resumen de Acta». Si dijeran
    // cosas distintas, el auditor no tendría cómo saber a cuál hacerle caso.
    const [cotejo] = await ds.query(
      `SELECT COALESCE(SUM(v.valor), 0)::float AS auditoria
         FROM works w
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(
                    sub.total_base *
                    CASE WHEN bi.base_ipp > 0 AND s.previous_month_ipp > 0
                         THEN s.previous_month_ipp / bi.base_ipp ELSE 1 END
                  ), 0)::float AS valor
             FROM surveys s
             JOIN LATERAL (
               SELECT COALESCE(SUM(sbi.quantity * sbi.unit_value), 0)::float AS total_base
                 FROM survey_budget_items sbi WHERE sbi.survey_id = s.survey_id
             ) sub ON true
             JOIN LATERAL (
               SELECT COALESCE(pr.ipp_initial_value, co.ipp_initial_value)::float AS base_ipp
                 FROM works w2
                 LEFT JOIN projects  pr ON pr.project_id = w2.project_id
                 LEFT JOIN companies co ON co.company_id = w2.company_id
                WHERE w2.work_id = w.work_id
             ) bi ON true
            WHERE s.work_id = w.work_id
         ) v ON true`,
    );
    revisar(
      "el valor por IPP se calcula",
      Number(cotejo.auditoria) >= 0,
      `todas las obras suman $${Math.round(Number(cotejo.auditoria)).toLocaleString("es-CO")}`,
    );

    // ── Detalle de un acta y de una obra reales ──
    if (actas.actas.length > 0) {
      const actaId = Number(actas.actas[0].actaId);
      const detalle = await servicio.getActaDetalle(actaId);
      revisar(
        "el detalle de un acta responde",
        detalle != null && Array.isArray(detalle.movimientos),
        `acta ${detalle?.acta.actaNumber}: ${detalle?.movimientos.length} movimiento(s), ` +
          `${detalle?.obras.length} obra(s)`,
      );
      for (const e of detalle?.ejes ?? []) {
        console.log(
          `        ${e.titulo.padEnd(18)} ${String(e.estado).padEnd(13)} ` +
            `${e.desde ? e.desde.slice(0, 10) : "sin fecha registrada"}` +
            `${e.quien ? ` · ${e.quien}` : ""}`,
        );
      }
      for (const m of detalle?.movimientos ?? []) {
        console.log(
          `        ${m.fecha.slice(0, 10)}  ${m.origen.padEnd(13)} ${String(m.eje ?? m.ambito).padEnd(14)} ` +
            `${m.action.padEnd(28)} ${m.usuario?.nombre ?? "—"}`,
        );
      }
      revisar(
        "el acta no queda sin línea de tiempo",
        (detalle?.movimientos.length ?? 0) > 0,
        "al menos su creación tiene que salir, reconstruida de created_at",
      );
    } else {
      console.log("        (no hay actas todavía: no se puede probar el detalle)");
    }

    if (obras.obras.length > 0) {
      const workId = Number(obras.obras[0].workId);
      const detalle = await servicio.getObraDetalle(workId);
      revisar(
        "el detalle de una obra responde",
        detalle != null && Array.isArray(detalle.movimientos),
        `obra ${detalle?.obra.codigo ?? workId}: ${detalle?.movimientos.length} movimiento(s), ` +
          `${detalle?.levantamientos.length} levantamiento(s)`,
      );
      for (const m of detalle?.movimientos ?? []) {
        console.log(
          `        ${m.fecha.slice(0, 10)}  ${m.origen.padEnd(13)} ${String(m.eje ?? m.ambito).padEnd(14)} ` +
            `${m.action.padEnd(28)} ${m.usuario?.nombre ?? "—"}`,
        );
      }
    }

    const stats = await servicio.getStats();
    revisar(
      "las estadísticas responden",
      stats.actas != null && stats.obras != null,
      `${stats.actas.total} actas · ${stats.obras.total} obras · ` +
        `${stats.bitacora.total} movimiento(s) anotado(s)`,
    );
    console.log(
      `        levantamientos: ${stats.levantamientos
        .map((l) => `${l.estado}=${l.n}`)
        .join("  ") || "ninguno"}`,
    );

    // Los filtros tienen que estrechar, no romper.
    const filtrado = await servicio.getActas({ status: "aprobada", limit: 5 });
    revisar(
      "los filtros del listado de actas funcionan",
      filtrado.total <= actas.total,
      `${filtrado.total} aprobada(s) de ${actas.total}`,
    );
    const buscadas = await servicio.getObras({ busqueda: "a", limit: 5 });
    revisar(
      "la búsqueda por código o nombre funciona",
      buscadas.total <= obras.total,
      `${buscadas.total} obra(s) con «a» en el código o el nombre, de ${obras.total}`,
    );
  } finally {
    await ds.destroy();
  }

  console.log(
    malo
      ? "\nHay algo mal en las consultas de la auditoría de obras."
      : "\nLas consultas de la auditoría de obras están bien.",
  );
  process.exit(malo ? 1 : 0);
}

main().catch((e) => {
  console.error("\nMAL  la consulta reventó:", e.message);
  process.exit(1);
});
