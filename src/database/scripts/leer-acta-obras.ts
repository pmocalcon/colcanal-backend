/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Las obras de un acta, con su empresa y proyecto: `ts-node ... 01-2026` */
async function main() {
  const numero = process.argv[2] ?? "01-2026";
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  const obras = await ds.query(
    `SELECT w.work_id, w.name, w.record_number, w.company_id, c.name AS empresa,
            w.project_id, p.name AS proyecto
       FROM works w
       LEFT JOIN companies c ON c.company_id = w.company_id
       LEFT JOIN projects p ON p.project_id = w.project_id
      WHERE w.record_number = $1
      ORDER BY w.company_id, w.project_id, w.work_id`,
    [numero],
  );

  console.log(`\n== Obras del acta ${numero}: ${obras.length} ==`);
  const grupos = new Map<string, number>();
  for (const o of obras) {
    const clave = `${o.company_id}:${o.project_id ?? ""}`;
    grupos.set(clave, (grupos.get(clave) ?? 0) + 1);
  }
  console.log("\n  clave companyId:projectId → obras");
  for (const [clave, n] of grupos) {
    const ej = obras.find(
      (o: any) => `${o.company_id}:${o.project_id ?? ""}` === clave,
    );
    console.log(
      `   ${clave.padEnd(6)} ${String(n).padStart(3)} obras   ${ej.empresa} / ${ej.proyecto ?? "(sin proyecto)"}`,
    );
  }

  console.log("\n  primeras obras:");
  for (const o of obras.slice(0, 12)) {
    console.log(
      `   ${String(o.work_id).padStart(5)}  proj=${String(o.project_id ?? "NULL").padEnd(5)} ${o.name}`,
    );
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
