/* SOLO LECTURA — este script no escribe nada en la base. */
/**
 * Lo escrito en el formato de préstamo, tal como entra a la cartera.
 *
 *     npx ts-node src/database/scripts/probar-prestamo-cartera.ts
 *
 * Al firmar Dirección Administrativa, el valor «2.000.000» se le mandaba tal cual a una
 * columna `numeric` y Postgres rechazaba el insert: ningún préstamo se podía firmar y en
 * pantalla solo salía «An error occurred while processing your request». Acá se prueban
 * las formas en que la gente escribe un valor, unas cuotas y una fecha, y se comprueba
 * contra la base que las solicitudes que están esperando firma sí van a pasar.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import {
  aValorCartera,
  aCuotasCartera,
  aFechaCartera,
  condicionesParaCartera,
} from "../../modules/gestion-conocimiento/prestamo-cartera";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

/** Lo que devuelve, o «error» si lo rechaza. */
const intentar = <T>(fn: () => T): T | "error" => {
  try {
    return fn();
  } catch {
    return "error";
  }
};

async function main() {
  // ── Valores de dinero ──
  const valores: Array<[string, string | null | "error"]> = [
    ["2.000.000", "2000000"],
    ["$ 2.000.000", "2000000"],
    ["2000000", "2000000"],
    ["2'000.000", "2000000"],
    ["$2.000.000,50", "2000000.50"],
    ["2,000,000.50", "2000000.50"],
    ["166.667", "166667"],
    ["1.5", "1.5"],
    ["", null],
    ["   ", null],
    ["dos millones", "error"],
  ];
  for (const [escrito, esperado] of valores) {
    const sale = intentar(() => aValorCartera(escrito, "el valor"));
    revisar(`valor «${escrito}»`, sale === esperado, `da ${JSON.stringify(sale)}`);
  }

  // ── Cuotas ──
  const cuotas: Array<[string, number | null | "error"]> = [
    ["12", 12],
    ["12 cuotas", 12],
    [" 6 ", 6],
    ["", null],
    ["doce", "error"],
    ["0", "error"],
  ];
  for (const [escrito, esperado] of cuotas) {
    const sale = intentar(() => aCuotasCartera(escrito, "las cuotas"));
    revisar(`cuotas «${escrito}»`, sale === esperado, `da ${JSON.stringify(sale)}`);
  }

  // ── Fechas ──
  const fechas: Array<[string, string | null | "error"]> = [
    ["15/09/2026", "2026-09-15"],
    ["15-09-2026", "2026-09-15"],
    ["2026-09-15", "2026-09-15"],
    ["15 de septiembre de 2026", "2026-09-15"],
    ["", null],
    ["31/02/2026", "error"],
    ["ya mismo", "error"],
  ];
  for (const [escrito, esperado] of fechas) {
    const sale = intentar(() => aFechaCartera(escrito, "la fecha"));
    revisar(`fecha «${escrito}»`, sale === esperado, `da ${JSON.stringify(sale)}`);
  }

  // El caso que reventaba: la solicitud 72, con el valor escrito con puntos de mil.
  const como72 = condicionesParaCartera({
    valorAprobado: "2.000.000",
    fechaDesembolso: "15/09/2026",
    numeroCuotas: "12",
    valorCuota: "166.667",
  });
  revisar(
    "el préstamo de 2.000.000 en 12 cuotas entra a la cartera",
    como72.valorPrestamo === "2000000" &&
      como72.saldo === "2000000" &&
      como72.valorCuota === "166667" &&
      como72.numeroCuotas === 12 &&
      como72.mesInicio === "2026-09-15",
    JSON.stringify(como72),
  );

  // ── Contra la base: lo que hoy está esperando firma ──
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
    logging: false,
  });
  await ds.initialize();
  try {
    const pendientes: Array<{ solicitud_id: number; data: Record<string, any> }> =
      await ds.query(
        `SELECT solicitud_id, data FROM gc_solicitudes
          WHERE formato = 'GTH-007-F' AND estado IN ('pendiente_administrativa', 'aprobado')
          ORDER BY solicitud_id`,
      );
    console.log(`\n== Solicitudes de préstamo firmadas o por firmar: ${pendientes.length} ==`);
    for (const p of pendientes) {
      const d = p.data ?? {};
      // Las condiciones las teclea Dirección Administrativa al firmar; si todavía no
      // están, lo que importa es que el valor aprobado sí se entienda.
      const sale = intentar(() =>
        condicionesParaCartera({
          ...d,
          fechaDesembolso: d.fechaDesembolso || "15/09/2026",
          numeroCuotas: d.numeroCuotas || "12",
          valorCuota: d.valorCuota || d.valorAprobado,
        }),
      );
      revisar(
        `solicitud ${p.solicitud_id} (${JSON.stringify(d.valorAprobado ?? "")})`,
        sale !== "error",
        sale === "error" ? "no se entiende lo escrito" : JSON.stringify(sale),
      );
    }
  } finally {
    await ds.destroy();
  }

  console.log(malo ? "\nHay algo mal en el paso a la cartera." : "\nEl paso a la cartera está bien.");
  process.exit(malo ? 1 : 0);
}

main().catch((e) => {
  console.error("MAL ", e.message);
  process.exit(1);
});
