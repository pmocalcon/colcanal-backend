/* SOLO LECTURA: cómo vienen los días de vacaciones, incapacidad y permiso. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();
  console.log("=== vacaciones: varias filas de la misma persona ===");
  console.table(await ds.query(`
    SELECT identificacion, nombre, periodo_causado, fecha_inicio, fecha_final,
           dias_disfrutar, dias_compensar, dias_pendientes
    FROM th_vacaciones
    WHERE identificacion IN (SELECT identificacion FROM th_vacaciones GROUP BY 1 HAVING count(*) > 1)
    ORDER BY identificacion, fecha_inicio NULLS FIRST LIMIT 12`));
  console.log("=== cuántas filas hay por persona ===");
  console.table(await ds.query(`
    SELECT count(*)::int AS filas, count(DISTINCT identificacion)::int AS personas FROM th_vacaciones`));
  console.log("=== incapacidades: días por año ===");
  console.table(await ds.query(`
    SELECT extract(year from fecha_inicio)::int AS anio, count(*)::int AS filas,
           sum(coalesce(total_dias,0))::int AS dias
    FROM th_incapacidades GROUP BY 1 ORDER BY 1 DESC LIMIT 5`));
  console.log("=== ausentismos: días de permiso por año ===");
  console.table(await ds.query(`
    SELECT extract(year from fecha_inicio)::int AS anio, count(*)::int AS filas,
           sum(coalesce(dias_permiso,0))::int AS dias_permiso,
           sum(coalesce(horas_ausencia,0))::numeric(10,1) AS horas
    FROM th_ausentismos GROUP BY 1 ORDER BY 1 DESC LIMIT 5`));
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
