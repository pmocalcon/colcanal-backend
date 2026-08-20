/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { normalizarDescripcion } from "../../modules/creg/creg.service";

/**
 * Comprueba lo que devuelve `GET /creg/comparador`.
 *
 * Usa la MISMA función de normalización que el servicio —importada, no copiada—
 * para que el resultado no pueda separarse del de la pantalla.
 */
const UMBRAL_ALERTA = 1.5;
const EMPRESAS_SIN_OPERACION = new Set([5, 11, 12, 13, 14]);

async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    logging: false,
    cache: false,
  });
  await ds.initialize();

  const ucaps = await ds.query(`
    SELECT u.company_id, u.project_id, u.code, u.description, u.rounded_value,
           COALESCE(p.name, c.name) AS municipio
      FROM ucaps u
      JOIN companies c     ON c.company_id = u.company_id
      LEFT JOIN projects p ON p.project_id = u.project_id
     WHERE u.is_active = true
  `);

  const vivos = ucaps.filter((u: any) => !EMPRESAS_SIN_OPERACION.has(Number(u.company_id)));
  const municipios = new Set(vivos.map((u: any) => `${u.company_id}:${u.project_id ?? 0}`));

  const filas = new Map<string, { municipios: Set<string>; valores: number[] }>();
  for (const u of vivos) {
    const clave = normalizarDescripcion(u.description ?? "");
    if (!clave) continue;
    if (!filas.has(clave)) filas.set(clave, { municipios: new Set(), valores: [] });
    const f = filas.get(clave)!;
    f.municipios.add(`${u.company_id}:${u.project_id ?? 0}`);
    const v = Number(u.rounded_value);
    if (Number.isFinite(v) && v > 0) f.valores.push(v);
  }

  const comparables = [...filas.entries()]
    .filter(([, f]) => f.municipios.size > 1)
    .map(([clave, f]) => ({
      clave,
      municipios: f.municipios.size,
      minimo: Math.min(...f.valores),
      maximo: Math.max(...f.valores),
      veces: Number((Math.max(...f.valores) / Math.min(...f.valores)).toFixed(2)),
    }))
    .sort((a, b) => b.municipios - a.municipios || b.veces - a.veces);

  console.log(
    `\nColumnas (municipios): ${municipios.size}\n` +
      `Filas (elementos): ${filas.size}\n` +
      `  comparables (2+ municipios): ${comparables.length}\n` +
      `  con diferencia >= ${UMBRAL_ALERTA}x: ${comparables.filter((c) => c.veces >= UMBRAL_ALERTA).length}\n`,
  );

  console.log("Los que más se repiten:\n");
  console.log("  muni       mínimo       máximo   veces   elemento");
  for (const c of comparables.slice(0, 12)) {
    console.log(
      `  ${String(c.municipios).padStart(4)} ${String(Math.round(c.minimo)).padStart(12)} ` +
        `${String(Math.round(c.maximo)).padStart(12)} ${String(c.veces).padStart(7)}   ${c.clave}`,
    );
  }
  console.log("");

  await ds.destroy();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
