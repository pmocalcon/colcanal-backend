/**
 * El recorrido de la Solicitud de Permiso, con el jefe inmediato de primero.
 *
 *     npx ts-node src/database/scripts/probar-flujo-permiso.ts
 *
 * Es una lectura del mapa de estados: no toca la base ni manda correos. Comprueba que
 * el camino sea Borrador → Jefe inmediato → Dir. Administrativa → Aprobado, que cada
 * paso lo pueda dar solo quien manda ahí, que ningún estado quede sin salida ni sin
 * aviso, y que al aprobarse se le avise a Talento Humano.
 */
import {
  PERMISO_ESTADOS,
  PERMISO_TRANSICIONES,
  PERMISO_NOTIFICAR_AL_LLEGAR,
  ROL_ADMINISTRATIVA_PERMISO,
  ROL_TALENTO_HUMANO_PERMISO,
  type PermisoEstado,
} from "../../modules/gestion-conocimiento/permiso-workflow";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

function main() {
  const T = PERMISO_TRANSICIONES;

  revisar(
    "el empleado la manda al jefe inmediato",
    T.enviar.from === "borrador" &&
      T.enviar.to === "pendiente_jefe" &&
      !!T.enviar.soloCreador,
    `${T.enviar.from} -> ${T.enviar.to} (${T.enviar.label})`,
  );

  revisar(
    "el jefe aprueba y pasa a la Dirección Administrativa",
    T.aprobar_jefe.from === "pendiente_jefe" &&
      T.aprobar_jefe.to === "pendiente_administrativa" &&
      !!T.aprobar_jefe.jefeAutorizador,
    `${T.aprobar_jefe.from} -> ${T.aprobar_jefe.to} (${T.aprobar_jefe.label})`,
  );

  revisar(
    "la Dirección revisa y cierra",
    T.revisar_administrativa.from === "pendiente_administrativa" &&
      T.revisar_administrativa.to === "aprobado" &&
      T.revisar_administrativa.roles.includes(ROL_ADMINISTRATIVA_PERMISO),
    `${T.revisar_administrativa.from} -> ${T.revisar_administrativa.to}`,
  );

  // Lo que el cambio de orden tenía que lograr: que nadie revise antes de que el jefe
  // decida, y que la Dirección no conceda el permiso por su cuenta.
  revisar(
    "la Dirección NO ve el permiso antes que el jefe",
    T.enviar.to !== "pendiente_administrativa",
    `el borrador sale hacia "${T.enviar.to}"`,
  );
  revisar(
    "el jefe NO cierra el trámite solo",
    T.aprobar_jefe.to !== "aprobado",
    "después de su firma todavía falta la revisión de la Dirección",
  );
  revisar(
    "el paso del jefe no lo da un rol fijo",
    T.aprobar_jefe.roles.length === 0 && !!T.aprobar_jefe.jefeAutorizador,
    "lo resuelve el autorizador del solicitante (tabla `autorizaciones`)",
  );

  for (const a of ["rechazar_jefe", "devolver_administrativa"]) {
    revisar(
      `${a} devuelve al borrador y pide motivo`,
      T[a].to === "borrador" && !!T[a].requiereMotivo,
      T[a].label,
    );
  }

  // Ningún estado sin salida, salvo el final.
  const estados = Object.keys(PERMISO_ESTADOS) as PermisoEstado[];
  const conSalida = new Set(Object.values(T).map((t) => t.from));
  for (const e of estados) {
    if (e === "aprobado") continue;
    revisar(`"${e}" tiene salida`, conSalida.has(e), PERMISO_ESTADOS[e].label);
  }

  // Ningún estado al que se llegue sin avisarle a alguien.
  for (const e of estados) {
    const aviso = PERMISO_NOTIFICAR_AL_LLEGAR[e];
    const alguien = !!aviso && (!!aviso.creador || !!aviso.jefe || !!aviso.roles?.length);
    revisar(`"${e}" avisa a alguien`, alguien, JSON.stringify(aviso ?? null));
  }

  revisar(
    "al aprobarse se le avisa a Talento Humano",
    !!PERMISO_NOTIFICAR_AL_LLEGAR.aprobado.roles?.includes(ROL_TALENTO_HUMANO_PERMISO),
    ROL_TALENTO_HUMANO_PERMISO,
  );
  revisar(
    "al aprobarse también se le avisa al solicitante",
    !!PERMISO_NOTIFICAR_AL_LLEGAR.aprobado.creador,
    "el permiso es suyo: tiene que enterarse de que se lo dieron",
  );
  revisar(
    "Talento Humano no aparece antes de la aprobación",
    (["borrador", "pendiente_jefe", "pendiente_administrativa"] as PermisoEstado[]).every(
      (e) => !PERMISO_NOTIFICAR_AL_LLEGAR[e].roles?.includes(ROL_TALENTO_HUMANO_PERMISO),
    ),
    "no decide nada, así que no se le avisa de pasos que no le tocan",
  );

  // El recorrido completo, caminado de verdad desde el borrador.
  let estado: PermisoEstado = "borrador";
  const camino: string[] = [estado];
  for (const accion of ["enviar", "aprobar_jefe", "revisar_administrativa"]) {
    const t = T[accion];
    if (t.from !== estado) {
      revisar("el camino feliz llega hasta el final", false, `"${accion}" no sale de "${estado}"`);
      break;
    }
    estado = t.to;
    camino.push(estado);
  }
  revisar("el camino feliz llega a aprobado", estado === "aprobado", camino.join(" -> "));

  console.log(malo ? "\nHay algo mal en el flujo." : "\nEl flujo del permiso está bien.");
  process.exit(malo ? 1 : 0);
}

main();
