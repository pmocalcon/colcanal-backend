/* SOLO LECTURA — este script no escribe nada en la base. */
/**
 * Quién puede corregir si el permiso es remunerado, y cómo se nombra el cambio.
 *
 *     npx ts-node src/database/scripts/probar-permiso-remuneracion.ts
 *
 * La casilla la marca el empleado al pedir el permiso, pero quien sabe si se paga o se
 * descuenta es la Dirección Administrativa y Financiera, y lo sabe cuando lo revisa.
 * Antes tenía que devolver el permiso para que el empleado cambiara una casilla que no
 * le corresponde decidir.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import {
  PERMISO_TRANSICIONES,
  PERMISO_AJUSTA_REMUNERACION,
  PERMISO_REMUNERACIONES,
  etiquetaRemuneracion,
  ROL_ADMINISTRATIVA_PERMISO,
} from "../../modules/gestion-conocimiento/permiso-workflow";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

async function main() {
  // Los dos pasos que la admiten son los de la Dirección, y ninguno más.
  for (const [accion, t] of Object.entries(PERMISO_TRANSICIONES)) {
    const admite = PERMISO_AJUSTA_REMUNERACION.has(accion);
    const esDeLaDireccion =
      t.from === "pendiente_administrativa" && t.roles.includes(ROL_ADMINISTRATIVA_PERMISO);
    revisar(
      `«${accion}»`,
      admite === esDeLaDireccion,
      admite ? "puede corregir la remuneración" : "no la toca",
    );
  }

  revisar(
    "el empleado no la cambia al enviar",
    !PERMISO_AJUSTA_REMUNERACION.has("enviar"),
    "«enviar» sale del borrador, donde la casilla se diligencia con el formato",
  );
  revisar(
    "el jefe tampoco",
    !PERMISO_AJUSTA_REMUNERACION.has("aprobar_jefe") &&
      !PERMISO_AJUSTA_REMUNERACION.has("rechazar_jefe"),
    "el jefe autoriza la ausencia; quién la paga lo decide la Dirección",
  );

  const etiquetas: Array<[unknown, string]> = [
    ["remunerado", "REMUNERADO"],
    ["no-remunerado", "NO REMUNERADO"],
    ["", "sin marcar"],
    [null, "sin marcar"],
    [undefined, "sin marcar"],
  ];
  for (const [valor, esperado] of etiquetas) {
    const sale = etiquetaRemuneracion(valor);
    revisar(`«${String(valor)}» en el correo`, sale === esperado, `dice «${sale}»`);
  }

  revisar(
    "solo se admiten los dos valores del formato",
    PERMISO_REMUNERACIONES.length === 3 &&
      PERMISO_REMUNERACIONES.includes("remunerado") &&
      PERMISO_REMUNERACIONES.includes("no-remunerado"),
    PERMISO_REMUNERACIONES.map((v) => `«${v}»`).join(", "),
  );

  // ── La base: qué traen hoy los permisos que están en manos de la Dirección ──
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
    logging: false,
  });
  await ds.initialize();
  try {
    const filas: Array<{ solicitud_id: number; nombre: string; remuneracion: string | null }> =
      await ds.query(
        `SELECT solicitud_id, data->>'nombre' AS nombre, data->>'remuneracion' AS remuneracion
           FROM gc_solicitudes
          WHERE formato = 'GTH-009-F' AND estado = 'pendiente_administrativa'
          ORDER BY solicitud_id`,
      );
    console.log(`\n== Permisos esperando a la Dirección: ${filas.length} ==`);
    for (const f of filas) {
      console.log(`        N.º ${f.solicitud_id}  ${f.nombre} — ${etiquetaRemuneracion(f.remuneracion)}`);
    }
    const raros = filas.filter(
      (f) => !(PERMISO_REMUNERACIONES as readonly string[]).includes(String(f.remuneracion ?? "")),
    );
    revisar(
      "lo guardado cabe en la casilla",
      raros.length === 0,
      raros.length === 0
        ? "ninguno trae un valor que la pantalla no sepa pintar"
        : raros.map((f) => `${f.solicitud_id}: «${f.remuneracion}»`).join(" · "),
    );
  } finally {
    await ds.destroy();
  }

  console.log(malo ? "\nHay algo mal en la remuneración del permiso." : "\nLa remuneración del permiso está bien.");
  process.exit(malo ? 1 : 0);
}

main().catch((e) => {
  console.error("MAL ", e.message);
  process.exit(1);
});
