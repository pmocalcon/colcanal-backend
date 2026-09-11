/**
 * Que se pueda aprobar un préstamo. Suena obvio; no lo era.
 *
 *     npx ts-node src/database/scripts/probar-prestamo-aprobacion.ts
 *
 * No toca la base: `llenarDatosPrestamo` y `exigirCamposObligatorios` son puras.
 *
 * ## Qué se está comprobando
 *
 * Los recuadros de Gerencia y de Dirección Administrativa no están guardados cuando esas
 * dos personas deciden: el formato se cierra al salir de borrador, así que sus casillas
 * llegan con la acción, en el payload. La comprobación de obligatorios corría **antes**
 * de llenarlas, de modo que siempre miraba la casilla vacía que había guardada, y toda
 * autorización de Gerencia moría en «Falta el Valor aprobado» —incluso acabando de
 * escribirlo—. Desde la bandeja de Aprobaciones, donde el valor ni se teclea porque se
 * aprueba por lo solicitado, no había manera de aprobar ninguno.
 *
 * Se prueban las dos mitades juntas y en ese orden porque el error no estaba en ninguna
 * de las dos: estaba en cuál iba primero. Probar `exigirCamposObligatorios` por su cuenta
 * habría pasado en verde con el trámite roto.
 */
import { exigirCamposObligatorios } from "../../modules/gestion-conocimiento/campos-obligatorios";
import { llenarDatosPrestamo } from "../../modules/gestion-conocimiento/prestamo-workflow";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

const HOY = "2026-09-11";

/** El camino real: se llena lo que trae el paso y después se comprueba qué falta. */
function decidir(
  accion: string,
  guardado: Record<string, any>,
  payload?: Record<string, any>,
): { data: Record<string, any>; error: string | null } {
  const data = llenarDatosPrestamo(accion, guardado, payload, "Gloria Escalante", HOY);
  try {
    exigirCamposObligatorios("GTH-007-F", accion, data);
    return { data, error: null };
  } catch (e) {
    return { data, error: (e as Error).message };
  }
}

/** La solicitud 49 tal como está en la base: radicada, sin valor aprobado todavía. */
const RADICADA = {
  nombreCompleto: "DANIEL ESTEBAN TORRES MORALES",
  numero: "1017…",
  valorSolicitado: "1000",
  valorAprobado: "",
  motivo: "PRUEBA DEL SISTEMA DE GESTIÓN",
};

function main() {
  // ── Gerencia aprueba desde la bandeja, sin teclear nada ──
  const bandeja = decidir("aprobar_gerencia", RADICADA);
  revisar(
    "Gerencia puede aprobar desde la bandeja de Aprobaciones",
    bandeja.error === null,
    bandeja.error ?? "pasa sin que le pidan nada más",
  );
  revisar(
    "aprobar sin teclear valor aprueba por lo solicitado",
    bandeja.data.valorAprobado === "1000",
    `valorAprobado = ${JSON.stringify(bandeja.data.valorAprobado)} (solicitado: 1000)`,
  );
  revisar(
    "y queda firmado por quien aprobó",
    bandeja.data.firmaGerencia === "Gloria Escalante" &&
      bandeja.data.fechaFirmaGerencia === HOY,
    `${bandeja.data.firmaGerencia} · ${bandeja.data.fechaFirmaGerencia}`,
  );

  // ── Gerencia aprueba por menos, desde el formato ──
  const porMenos = decidir("aprobar_gerencia", RADICADA, { valorAprobado: "800" });
  revisar(
    "Gerencia puede aprobar por menos de lo solicitado",
    porMenos.error === null && porMenos.data.valorAprobado === "800",
    `pidió 1000, se aprueban ${porMenos.data.valorAprobado}`,
  );

  // ── Y la comprobación sigue sirviendo para algo ──
  const sinNada = decidir("aprobar_gerencia", { ...RADICADA, valorSolicitado: "" });
  revisar(
    "sin valor solicitado ni aprobado, no se aprueba",
    sinNada.error !== null && /[Vv]alor aprobado/.test(sinNada.error),
    sinNada.error ?? "pasó, y no debía: un préstamo sin monto no es un préstamo",
  );

  // ── Dirección Administrativa firma con las condiciones en la mano ──
  const firma = decidir("aprobar_administrativa", { ...RADICADA, valorAprobado: "1000" }, {
    fechaDesembolso: "2026-10-01",
    numeroCuotas: "4",
    valorCuota: "250",
  });
  revisar(
    "Dirección Administrativa puede firmar con las condiciones que acaba de pactar",
    firma.error === null,
    firma.error ?? "fecha de desembolso, cuotas y valor de cuota entran con la acción",
  );

  const sinCondiciones = decidir("aprobar_administrativa", {
    ...RADICADA,
    valorAprobado: "1000",
  });
  revisar(
    "pero no puede firmar sin pactarlas",
    sinCondiciones.error !== null,
    sinCondiciones.error ??
      "pasó, y no debía: el préstamo nacería en la cartera sin cuota ni desembolso",
  );

  // ── Rechazar nunca puede exigir casillas: es la salida de un formato incompleto ──
  for (const accion of ["rechazar_gerencia", "rechazar_administrativa"]) {
    const r = decidir(accion, { valorSolicitado: "", valorAprobado: "" });
    revisar(
      `«${accion}» no exige casillas`,
      r.error === null,
      r.error ?? "devolver un formato a medias es justamente para lo que sirve",
    );
  }

  // ── El envío se sigue comprobando contra lo guardado, que es donde vive ──
  const envioIncompleto = decidir("enviar", { primerNombre: "Daniel" });
  revisar(
    "enviar sigue exigiendo el formato completo",
    envioIncompleto.error !== null && /Primer apellido/.test(envioIncompleto.error),
    envioIncompleto.error ?? "pasó, y no debía",
  );
  revisar(
    "y nombra de una vez todo lo que falta",
    (envioIncompleto.error ?? "").split(",").length > 3,
    `${(envioIncompleto.error ?? "").slice(0, 90)}…`,
  );

  console.log(
    malo
      ? "\nHay algo mal en la aprobación de préstamos."
      : "\nLa aprobación de préstamos está bien.",
  );
  process.exit(malo ? 1 : 0);
}

main();
