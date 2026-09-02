/* SOLO LECTURA — ¿el issue_date de las órdenes coincide con el día en que se crearon? */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  const r = await ds.query(`
    SELECT (po.issue_date - (po.created_at AT TIME ZONE 'America/Bogota')::date)::int AS desfase,
           COUNT(*)::int AS cuantas,
           MIN(po.created_at)::date::text AS desde,
           MAX(po.created_at)::date::text AS hasta
      FROM purchase_orders po
     GROUP BY 1 ORDER BY 2 DESC
  `);
  console.log("Desfase entre issue_date y el día real de creación (hora de Bogotá):\n");
  for (const f of r) {
    const et = f.desfase === 0 ? "coinciden" : `${f.desfase > 0 ? "+" : ""}${f.desfase} día(s)`;
    console.log(`  ${et.padEnd(14)} ${String(f.cuantas).padStart(5)} órdenes   (${f.desde} a ${f.hasta})`);
  }

  const hora = await ds.query(`
    SELECT to_char(po.created_at AT TIME ZONE 'America/Bogota','HH24') AS h, COUNT(*)::int AS n
      FROM purchase_orders po
     WHERE (po.issue_date - (po.created_at AT TIME ZONE 'America/Bogota')::date)::int <> 0
     GROUP BY 1 ORDER BY 1
  `);
  if (hora.length) {
    console.log("\nA qué hora (Bogotá) se crearon las que NO coinciden:");
    console.log("  " + hora.map((x: any) => `${x.h}h:${x.n}`).join("  "));
    console.log("  (si se reparten por todo el día, no es un problema de zona horaria)");
  }
  await ds.destroy();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
