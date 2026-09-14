/**
 * A quién se le manda la liquidación de nómina una vez revisada.
 *
 * Va en su propio archivo, y no enterrado en el servicio, porque es lo único de todo el
 * flujo que cambia por razones del negocio y no del programa: si mañana la nómina la
 * recibe otra persona o el rol se llama distinto, se corrige acá.
 *
 * **No es un correo quemado a propósito.** Se resuelve contra la tabla de usuarios, así
 * que si a la persona le cambian la dirección, el sistema la sigue.
 *
 * Hoy la recibe **Aurora Rivera**. Se afina por nombre y no solo por rol porque darle el
 * aviso de la nómina a un rol entero se lo da a quien tenga ese rol mañana. Antes era
 * Yamileth Osorio; sigue entrando a Solicitudes de pago (`ACCESO_SOLO_PAGOS`), pero ya no
 * recibe el correo.
 */
export const DESTINO_LIQUIDACION = {
  rol: "Compras",
  /** Se compara en minúsculas contra `users.nombre`. */
  nombreContiene: "rivera",
  /** Solo para mostrarlo en pantalla cuando todavía no se ha resuelto nadie. */
  descripcion: "Aurora Rivera",
} as const;

/**
 * Quienes **entran** a Solicitudes de pago sin ser del área de Talento Humano y **sin**
 * recibir el aviso de la liquidación. Hoy:
 *
 * - Yamileth Osorio. Hay otra usuaria con su mismo rol, Yohana Tobón, que no entra: por
 *   eso va por rol y nombre.
 *
 * Quien recibe el aviso (`DESTINO_LIQUIDACION`) entra también, sin necesidad de estar acá:
 * el correo manda a esa pantalla y tiene que poder abrirla.
 *
 * Espejo del acceso a pagos en el frontend (`puedeVerSolicitudesPago`,
 * talentoHumano.service.ts): si se agrega alguien aquí y no allá, entra por la URL pero no
 * ve la tarjeta; al revés, ve la tarjeta y le sale un 403.
 */
export const ACCESO_SOLO_PAGOS: readonly { rol: string; nombreContiene: string }[] = [
  { rol: "Coordinador Financiero", nombreContiene: "osorio" },
];

interface UsuarioConRol {
  userId: number;
  nombre?: string | null;
  role?: { nombreRol?: string | null } | null;
}

const coincide = (
  u: UsuarioConRol,
  p: { rol: string; nombreContiene: string },
): boolean =>
  (u.role?.nombreRol ?? "").trim().toLowerCase() === p.rol.toLowerCase() &&
  (u.nombre ?? "").toLowerCase().includes(p.nombreContiene);

/**
 * A quién le llega la liquidación, de entre los usuarios activos.
 *
 * A `DESTINO_LIQUIDACION`, y a nadie más.
 *
 * Si no se encuentra —salió de la empresa, le cambiaron el nombre o el rol— el aviso cae a
 * las personas de `ACCESO_SOLO_PAGOS`, no al rol entero de Compras. Son quienes pueden
 * hacer algo con él, y la alternativa es peor: sin destinatario no se puede mandar la
 * nómina, y sesenta personas se quedan sin pago por un cambio en la ficha de una.
 */
export function elegirDestinatariosLiquidacion<U extends UsuarioConRol>(activos: U[]): U[] {
  const principales = activos.filter((u) => coincide(u, DESTINO_LIQUIDACION));
  if (principales.length > 0) return principales;
  return activos.filter((u) => ACCESO_SOLO_PAGOS.some((p) => coincide(u, p)));
}
