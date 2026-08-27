/**
 * El recorrido de la Solicitud de Préstamo, con Gerencia de primera.
 *
 *     npx ts-node src/database/scripts/probar-flujo-prestamo.ts
 *
 * Es una lectura del mapa de estados: no toca la base ni manda correos. Comprueba que
 * el camino sea Borrador → Gerencia → Dirección Administrativa → Aprobado, que cada paso
 * lo pueda dar solo quien manda ahí, y que ningún estado quede sin salida ni sin aviso.
 */
import {
  PRESTAMO_ESTADOS,
  PRESTAMO_TRANSICIONES,
  PRESTAMO_NOTIFICAR_AL_LLEGAR,
  PRESTAMO_ENTERAR_AL_LLEGAR,
  ROL_ADMINISTRATIVA,
  ROL_GERENCIA,
  type PrestamoEstado,
} from "../../modules/gestion-conocimiento/prestamo-workflow";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

/** El camino feliz, paso por paso, como lo recorrería una solicitud de verdad. */
function main() {
  const T = PRESTAMO_TRANSICIONES;

  revisar("el empleado la manda a Gerencia",
    T.enviar.from === "borrador" && T.enviar.to === "pendiente_gerencia" && !!T.enviar.soloCreador,
    `${T.enviar.from} -> ${T.enviar.to} (${T.enviar.label})`);

  revisar("Gerencia autoriza y pasa a Administrativa",
    T.aprobar_gerencia.from === "pendiente_gerencia"
      && T.aprobar_gerencia.to === "pendiente_administrativa"
      && T.aprobar_gerencia.roles.includes(ROL_GERENCIA),
    `${T.aprobar_gerencia.from} -> ${T.aprobar_gerencia.to} (${T.aprobar_gerencia.label})`);

  revisar("Administrativa firma y cierra",
    T.aprobar_administrativa.from === "pendiente_administrativa"
      && T.aprobar_administrativa.to === "aprobado"
      && T.aprobar_administrativa.roles.includes(ROL_ADMINISTRATIVA),
    `${T.aprobar_administrativa.from} -> ${T.aprobar_administrativa.to}`);

  revisar("Administrativa NO autoriza el valor",
    !T.aprobar_gerencia.roles.includes(ROL_ADMINISTRATIVA),
    "el paso de Gerencia no lo puede dar Administrativa");
  revisar("Gerencia NO cierra el trámite sola",
    !T.aprobar_administrativa.roles.includes(ROL_GERENCIA),
    "falta la firma de Administrativa");

  for (const a of ["rechazar_gerencia", "rechazar_administrativa"]) {
    revisar(`${a} devuelve al borrador y pide motivo`,
      T[a].to === "borrador" && !!T[a].requiereMotivo, T[a].label);
  }

  // Ningún estado sin salida, salvo el final.
  const estados = Object.keys(PRESTAMO_ESTADOS) as PrestamoEstado[];
  const conSalida = new Set(Object.values(T).map((t) => t.from));
  const sinSalida = estados.filter((e) => e !== "aprobado" && !conSalida.has(e));
  revisar("ningún estado queda sin salida", sinSalida.length === 0, sinSalida.join(", ") || "todos avanzan");

  // Ningún estado alcanzable sin quien lo atienda.
  const sinAviso = estados.filter((e) => {
    const d = PRESTAMO_NOTIFICAR_AL_LLEGAR[e];
    return d !== "creador" && d.length === 0;
  });
  revisar("todo estado avisa a alguien", sinAviso.length === 0, sinAviso.join(", ") || "todos avisan");

  revisar("a Administrativa se le avisa de entrada",
    PRESTAMO_ENTERAR_AL_LLEGAR.pendiente_gerencia.includes(ROL_ADMINISTRATIVA),
    "llega a su turno con el caso ya visto");
  revisar("nadie recibe dos correos del mismo paso",
    estados.every((e) => {
      const debeActuar = PRESTAMO_NOTIFICAR_AL_LLEGAR[e];
      if (debeActuar === "creador") return true;
      return !PRESTAMO_ENTERAR_AL_LLEGAR[e].some((r) => debeActuar.includes(r));
    }),
    "el aviso de cortesía no se le manda a quien ya le toca");

  console.log("     recorrido:");
  let estado: PrestamoEstado = "borrador";
  const visto = new Set<string>();
  while (estado !== "aprobado") {
    const paso = Object.values(T).find((t) => t.from === estado && t.to !== "borrador");
    if (!paso || visto.has(estado)) { revisar("el camino llega a aprobado", false, `atascado en ${estado}`); break; }
    visto.add(estado);
    console.log(`       ${PRESTAMO_ESTADOS[estado].label} --[${paso.label}]--> ${PRESTAMO_ESTADOS[paso.to].label}`);
    estado = paso.to;
  }
  revisar("el camino llega a aprobado", estado === "aprobado", `terminó en ${estado}`);

  console.log(malo ? "HAY ALGO MAL" : "TODO CUADRA");
  if (malo) process.exit(1);
}
main();
