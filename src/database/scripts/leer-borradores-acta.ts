/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Borradores guardados del Resumen de Acta, y de qué municipio es su texto. */
async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  const filas = await ds.query(
    `SELECT d.company_id, d.project_id, d.acta_number, d.updated_at,
            c.name AS empresa, p.name AS proyecto,
            d.payload
       FROM acta_summary_drafts d
       LEFT JOIN companies c ON c.company_id = d.company_id
       LEFT JOIN projects p ON p.project_id = d.project_id
      ORDER BY d.company_id, d.project_id NULLS FIRST, d.acta_number`,
  );

  console.log(`\n== Borradores guardados: ${filas.length} ==\n`);
  for (const f of filas) {
    const pl = f.payload ?? {};
    // El logo delata de qué municipio salió el texto: cada config trae el suyo.
    const logo: string = pl.logoUrl ?? "(sin logo)";
    const titulo: string = Array.isArray(pl.tituloLineas)
      ? pl.tituloLineas.join(" / ")
      : (pl.docFields?.municipio ?? "");
    console.log(
      `  ${String(f.company_id)}:${f.project_id ?? ""}  acta ${f.acta_number}`
      + `  (${f.empresa}${f.proyecto ? " / " + f.proyecto : ""})`,
    );
    console.log(`      logo   : ${logo}`);
    if (titulo) console.log(`      título : ${titulo.slice(0, 110)}`);
    console.log(`      guardado: ${f.updated_at?.toISOString?.() ?? f.updated_at}`);
    console.log();
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
