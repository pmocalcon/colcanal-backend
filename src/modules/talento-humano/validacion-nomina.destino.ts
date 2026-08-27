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
