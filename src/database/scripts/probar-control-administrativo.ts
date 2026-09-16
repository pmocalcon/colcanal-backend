/* SOLO LECTURA — este script no escribe nada en la base. */
/**
 * El visto bueno de Dirección Administrativa sobre la planilla de horas extras.
 *
 *     npx ts-node src/database/scripts/probar-control-administrativo.ts
 *
 * La planilla le llega aprobada y ella la liquida en nómina. Antes solo podía
 * devolverla; ahora también puede dejar constancia de que la revisó, que es lo que firma
 * el recuadro «Control Administrativo» del formato.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import {
  HORAS_EXTRAS_TRANSICIONES,
  HORAS_EXTRAS_FIRMA_POR_ACCION,
  ROL_ADMINISTRATIVA,
} from "../../modules/gestion-conocimiento/horas-extras-workflow";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

async function main() {
  const t = HORAS_EXTRAS_TRANSICIONES["revisar_administrativa"];
  revisar("existe la acción", !!t, t ? `«${t.label}»` : "no está");
  if (!t) process.exit(1);

  revisar(
    "no mueve la planilla",
    t.from === "aprobado" && t.to === "aprobado",
    `${t.from} → ${t.to}: sigue aprobada y lista para liquidar`,
  );
  revisar(
    "es de Dirección Administrativa y de nadie más",
    t.roles.length === 1 && t.roles[0] === ROL_ADMINISTRATIVA,
    t.roles.join(", "),
  );
  revisar(
    "no aparece como trabajo pendiente",
    !!t.correctiva,
    "es un visto bueno sobre una planilla cerrada, no un paso del flujo",
  );
  revisar("no pide motivo", !t.requiereMotivo, "es un visto bueno, no una devolución");

  const firma = HORAS_EXTRAS_FIRMA_POR_ACCION["revisar_administrativa"];
  revisar(
    "firma el recuadro del formato",
    firma?.nombre === "controlAdministrativoPor" && firma?.fecha === "fechaControlAdministrativo",
    JSON.stringify(firma),
  );

  // Devolver la planilla borra todas las firmas, y esta tiene que ser una de ellas: al
  // volver a recorrer la cadena, el visto bueno anterior ya no vale.
  revisar(
    "la devolución también borra este visto bueno",
    Object.keys(HORAS_EXTRAS_FIRMA_POR_ACCION).includes("revisar_administrativa"),
    "está en el mapa de firmas, que es lo que se limpia al devolver",
  );

  const devolver = HORAS_EXTRAS_TRANSICIONES["devolver_administrativa"];
  revisar(
    "sigue pudiendo devolverla",
    devolver?.from === "aprobado" && devolver?.to === "borrador" && !!devolver?.requiereMotivo,
    "con motivo, como antes",
  );

  // ── La base: sobre qué planillas aparecerá el botón ──
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
    logging: false,
  });
  await ds.initialize();
  try {
    const filas: Array<{ solicitud_id: number; nombre: string; quien: string | null; cuando: string | null }> =
      await ds.query(
        `SELECT solicitud_id, data->>'nombre' AS nombre,
                data->>'controlAdministrativoPor' AS quien,
                data->>'fechaControlAdministrativo' AS cuando
           FROM gc_solicitudes
          WHERE formato = 'GTH-016-F' AND estado = 'aprobado'
          ORDER BY solicitud_id`,
      );
    console.log(`\n== Planillas aprobadas: ${filas.length} ==`);
    for (const f of filas) {
      console.log(
        `        N.º ${f.solicitud_id}  ${f.nombre ?? ""} — ${
          f.quien ? `revisada por ${f.quien}${f.cuando ? ` el ${f.cuando}` : ""}` : "sin visto bueno todavía"
        }`,
      );
    }
  } finally {
    await ds.destroy();
  }

  console.log(malo ? "\nHay algo mal en el control administrativo." : "\nEl control administrativo está bien.");
  process.exit(malo ? 1 : 0);
}

main().catch((e) => {
  console.error("MAL ", e.message);
  process.exit(1);
});
