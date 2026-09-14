/**
 * A quién se le manda la liquidación de nómina una vez revisada.
 *
 * Va en su propio archivo, y no enterrado en el servicio, porque es lo único de todo el
 * flujo que cambia por razones del negocio y no del programa: si mañana la nómina la
 * recibe otra persona o el rol se llama distinto, se corrige acá.
 *
 * **No es un correo quemado a propósito.** Se resuelve contra la tabla de usuarios, así
 * que si a la persona le cambian la dirección, el sistema la sigue. Lo que sí hay que
 * afinar por nombre es cuál de las dos: hoy hay dos usuarias con el rol de Coordinación
 * Financiera —Yamileth Osorio y Yohana Tobón— y la nómina es de Yamileth. Si el filtro
 * por nombre no encuentra a nadie, el servicio cae de vuelta a todo el rol: es preferible
 * que el correo le llegue de más a alguien del área a que deje de salir en silencio.
 */
export const DESTINO_LIQUIDACION = {
  rol: "Coordinador Financiero",
  /** Se compara en minúsculas contra `users.nombre`. */
  nombreContiene: "osorio",
  /** Solo para mostrarlo en pantalla cuando todavía no se ha resuelto nadie. */
  descripcion: "Coordinación Financiera",
} as const;

/**
 * Quienes, además de `DESTINO_LIQUIDACION`, **entran a Solicitudes de pago y reciben el
 * aviso de la liquidación**, sin ser del área de Talento Humano. Hoy:
 *
 * - Aurora Rivera, única usuaria con el rol «Compras».
 *
 * Es una sola lista para las dos cosas a propósito: quien recibe el correo «lista para
 * pago» tiene que poder abrir la pantalla que el correo le indica, y quien hace el giro
 * tiene que enterarse de que hay uno. Dos listas se separarían.
 *
 * Van por rol **y** nombre: darle esto a un rol entero se lo da a quien lo tenga mañana.
 * Espejo de `PAGOS_ADICIONALES` en el frontend (talentoHumano.service.ts).
 */
export const ACCESO_SOLO_PAGOS: readonly { rol: string; nombreContiene: string }[] = [
  { rol: "Compras", nombreContiene: "rivera" },
];

interface UsuarioConRol {
  userId: number;
  nombre?: string | null;
  role?: { nombreRol?: string | null } | null;
}

/**
 * A quién le llega la liquidación, de entre los usuarios activos.
 *
 * Primero quien la recibe (`DESTINO_LIQUIDACION`), afinado por nombre porque hay dos
 * personas con el rol de Coordinación Financiera. Si el nombre no encuentra a nadie cae a
 * todo el rol: es preferible que el correo le llegue de más a alguien del área a que deje
 * de salir sin que nadie se entere.
 *
 * Después, `ACCESO_SOLO_PAGOS`. Estas **no** tienen esa caída: si Aurora sale de la
 * empresa, el aviso no se le manda a quien herede el rol de Compras. Sin repetir a nadie.
 */
export function elegirDestinatariosLiquidacion<U extends UsuarioConRol>(activos: U[]): U[] {
  const rolDe = (u: U) => (u.role?.nombreRol ?? "").trim().toLowerCase();
  const nombreDe = (u: U) => (u.nombre ?? "").toLowerCase();

  const delRol = activos.filter((u) => rolDe(u) === DESTINO_LIQUIDACION.rol.toLowerCase());
  const afinado = delRol.filter((u) => nombreDe(u).includes(DESTINO_LIQUIDACION.nombreContiene));
  const principales = afinado.length > 0 ? afinado : delRol;

  const adicionales = activos.filter((u) =>
    ACCESO_SOLO_PAGOS.some(
      (p) => rolDe(u) === p.rol.toLowerCase() && nombreDe(u).includes(p.nombreContiene),
    ),
  );

  const vistos = new Set<number>();
  return [...principales, ...adicionales].filter((u) => {
    if (vistos.has(u.userId)) return false;
    vistos.add(u.userId);
    return true;
  });
}
