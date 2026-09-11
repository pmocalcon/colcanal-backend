/**
 * La regla con que la auditoría de obras junta lo anotado con lo deducido.
 *
 *     npx ts-node src/database/scripts/probar-auditoria-obras.ts
 *
 * No toca la base: `fundirMovimientos` es pura.
 *
 * Se prueba esto y no las consultas porque es lo único que puede fallar **en silencio**.
 * Una consulta rota se ve —la pantalla queda vacía o revienta—; una fusión mal hecha
 * devuelve una línea de tiempo de aspecto normal en la que un rechazo desapareció, o en
 * la que la misma aprobación sale dos veces con dos autores distintos. Para quien audita,
 * las dos cosas son peores que no tener la pantalla.
 */
import {
  fundirMovimientos,
  type MovimientoObra,
} from "../../modules/audit/obras-audit.service";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

const mov = (
  fecha: string,
  origen: "registrado" | "reconstruido",
  eje: string | null,
  action: string,
  ambito: MovimientoObra["ambito"] = "acta",
): MovimientoObra => ({
  logId: origen === "registrado" ? 1 : null,
  fecha: new Date(fecha).toISOString(),
  ambito,
  eje,
  action,
  previousStatus: null,
  newStatus: null,
  comments: null,
  usuario: null,
  origen,
  workId: null,
  obra: null,
});

const acciones = (ms: MovimientoObra[]) => ms.map((m) => m.action).join(" → ");

function main() {
  // ── Sin bitácora: todo lo deducido sobrevive ──
  const soloViejo = fundirMovimientos(
    [],
    [
      mov("2026-01-10T10:00:00Z", "reconstruido", "acta", "crear"),
      mov("2026-02-01T10:00:00Z", "reconstruido", "acta", "aprobar"),
    ],
  );
  revisar(
    "un acta anterior a la bitácora conserva su historia",
    soloViejo.length === 2 && soloViejo.every((m) => m.origen === "reconstruido"),
    acciones(soloViejo),
  );

  // ── Lo deducido posterior al primer renglón anotado se descarta ──
  const conBitacora = fundirMovimientos(
    [mov("2026-03-01T10:00:00Z", "registrado", "acta", "revisar")],
    [
      mov("2026-01-10T10:00:00Z", "reconstruido", "acta", "crear"),
      // Esta es la misma aprobación que ya quedó anotada: sale de `approved_at`.
      mov("2026-03-05T10:00:00Z", "reconstruido", "acta", "aprobar"),
    ],
  );
  revisar(
    "la aprobación no sale dos veces",
    conBitacora.length === 2 && conBitacora.filter((m) => m.action === "aprobar").length === 0,
    acciones(conBitacora),
  );
  revisar(
    "pero lo anterior a la bitácora no se pierde",
    conBitacora[0].action === "crear" && conBitacora[0].origen === "reconstruido",
    `primero: ${conBitacora[0].action} (${conBitacora[0].origen})`,
  );

  // ── El corte es por carril, no por acta ──
  const dosCarriles = fundirMovimientos(
    [mov("2026-03-01T10:00:00Z", "registrado", "cronograma", "aprobar_cronograma")],
    [
      mov("2026-01-10T10:00:00Z", "reconstruido", "acta", "crear"),
      // Muy posterior al movimiento anotado, pero de OTRO carril: tiene que sobrevivir.
      mov("2026-06-01T10:00:00Z", "reconstruido", "rq_anticipada", "autorizar_compra_anticipada"),
    ],
  );
  revisar(
    "un carril con bitácora no silencia a los demás",
    dosCarriles.length === 3 &&
      dosCarriles.some((m) => m.eje === "rq_anticipada"),
    acciones(dosCarriles),
  );

  // ── Corte en el primer anotado del carril, no en el último ──
  const variosAnotados = fundirMovimientos(
    [
      mov("2026-05-01T10:00:00Z", "registrado", "acta", "devolver"),
      mov("2026-03-01T10:00:00Z", "registrado", "acta", "enviar_revision"),
    ],
    [mov("2026-04-01T10:00:00Z", "reconstruido", "acta", "revisar")],
  );
  revisar(
    "el corte es el primer movimiento anotado del carril",
    variosAnotados.length === 2 && !variosAnotados.some((m) => m.origen === "reconstruido"),
    `${acciones(variosAnotados)} (lo deducido del 1 de abril cae dentro de lo ya anotado)`,
  );

  // ── Orden cronológico, mezclando los dos orígenes ──
  const mezclado = fundirMovimientos(
    [mov("2026-03-01T10:00:00Z", "registrado", "acta", "enviar_revision")],
    [
      mov("2026-02-01T10:00:00Z", "reconstruido", "obra", "crear", "obra"),
      mov("2026-01-01T10:00:00Z", "reconstruido", "acta", "crear"),
    ],
  );
  const fechas = mezclado.map((m) => Date.parse(m.fecha));
  revisar(
    "la línea de tiempo queda en orden",
    fechas.every((t, i) => i === 0 || fechas[i - 1] <= t),
    acciones(mezclado),
  );

  // ── Sin eje, el carril es el ámbito ──
  const sinEje = fundirMovimientos(
    [mov("2026-03-01T10:00:00Z", "registrado", null, "aprobar", "levantamiento")],
    [
      mov("2026-01-01T10:00:00Z", "reconstruido", null, "crear", "levantamiento"),
      mov("2026-06-01T10:00:00Z", "reconstruido", null, "rechazar", "levantamiento"),
      // Otro ámbito: no lo tapa la bitácora del levantamiento.
      mov("2026-06-01T10:00:00Z", "reconstruido", null, "crear", "obra"),
    ],
  );
  revisar(
    "sin eje, cada ámbito es su propio carril",
    sinEje.length === 3 && sinEje.some((m) => m.ambito === "obra"),
    acciones(sinEje),
  );

  // ── Nada que juntar ──
  revisar(
    "sin movimientos no se inventa ninguno",
    fundirMovimientos([], []).length === 0,
    "un acta recién creada sin nada anotado devuelve una lista vacía",
  );

  console.log(
    malo
      ? "\nHay algo mal en la línea de tiempo de obras."
      : "\nLa línea de tiempo de obras está bien.",
  );
  process.exit(malo ? 1 : 0);
}

main();
