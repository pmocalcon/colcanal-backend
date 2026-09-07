/**
 * Quién ve cuáles solicitudes en Gestión del conocimiento.
 *
 * Antes el listado devolvía **todas** las solicitudes a cualquiera que entrara: un
 * director de proyecto que pedía un contrato veía también los de los demás, con nombre del
 * contratista y valor. Eso no era una decisión, era que el filtro `mine` existía pero
 * quedaba en manos del navegador, y un filtro que el cliente decide no restringe nada.
 *
 * La regla queda acá y la aplica el servidor.
 */

/**
 * Las áreas que tramitan o firman, y por eso ven todo el listado: Jurídica,
 * Administrativa, Financiera, Gerencia y el PMO.
 *
 * Gerencia de Proyectos **no** está acá: firma dentro del trámite pero su alcance no es
 * todo el listado sino lo que piden los proyectos. Ver `ALCANCE_POR_ROL`.
 *
 * Los nombres van literales y **no** desde `ROLE_NAMES`: esa constante tiene
 * `DIRECTOR_FINANCIERO: "Director Financiero"` y el rol real de la base se llama
 * «Director Financiero y Administrativo», así que usarla dejaría fuera justo al área
 * dueña del trámite sin que nada fallara.
 */
export const ROLES_VEN_TODAS: readonly string[] = [
  // Jurídica: genera y revisa el contrato.
  "Director Jurídico",
  "Coordinador Jurídico",
  "Analista Jurídico",
  // Administrativa: tramita la RQ y sus documentos.
  "Director Financiero y Administrativo",
  "Analista Administrativo",
  // Financiera: paga y legaliza.
  "Coordinador Financiero",
  "Contabilidad",
  // Gerencia firma el contrato.
  "Gerencia",
  // El comodín transversal.
  "Analista PMO",
  // Director PMO NO ve todo: solo lo que él crea, más lo que espera su acción y lo
  // que ya tramitó (lo resuelve `filtrarVisibles`). Se le quitó a propósito para que
  // su bandeja no arrastre el listado completo de cada gestión.
];

export const veTodasLasSolicitudes = (nombreRol?: string | null): boolean =>
  ROLES_VEN_TODAS.includes((nombreRol ?? "").trim());

/**
 * Gestiones en las que **casi nadie** ve el listado completo, ni las áreas que tramitan o
 * firman: cada quien ve solo lo que él crea, más lo que espera su acción y lo que ya
 * tramitó. Las excepciones van en `VEN_TODO_PESE_A_SOLO_PROPIAS`.
 *
 * Contable entra acá porque un anticipo o una cuenta entre compañías es plata de quien
 * la pide; que media compañía viera el borrador de todo el mundo antes de que llegara a
 * su paso no es tramitar, es mirar por encima del hombro. Cuando el trámite sí toca a
 * alguien, `filtrarVisibles` se lo muestra igual por «acción pendiente» —no se pierde
 * ningún paso del flujo.
 *
 * Es por gestión y no por rol a propósito: el mismo Director Jurídico debe seguir viendo
 * todo en Jurídica (allí Administrativa tramita los contratos), así que la restricción
 * cuelga de la gestión, no de la persona.
 */
export const GESTIONES_SOLO_PROPIAS: readonly string[] = ["contable"];

export const gestionEsSoloPropia = (gestion?: string | null): boolean =>
  GESTIONES_SOLO_PROPIAS.includes((gestion ?? "").trim());

/**
 * Quién sí ve el listado completo de una gestión restringida, pese a
 * `GESTIONES_SOLO_PROPIAS`. La llave es la gestión; la lista, los roles exentos.
 *
 * En contable va la Dirección Financiera y Administrativa porque es la dueña del rubro:
 * responde por la caja y por lo que se anticipa, y sin esto solo alcanzaba a ver un
 * anticipo si le tocaba firmarlo. Como el pago lo registra Tesorería y la aprobación la
 * da Gerencia, había anticipos que pasaban de principio a fin sin aparecerle nunca —los
 * tres que hay hoy, sin ir más lejos.
 *
 * La lista es corta a propósito: la restricción sigue siendo la regla y esto la excepción
 * de quien tiene que responder por el dinero, no un permiso de área. Si mañana Tesorería
 * o Contabilidad necesitan lo mismo, se agregan acá y en ningún otro lado.
 */
export const VEN_TODO_PESE_A_SOLO_PROPIAS: Record<string, readonly string[]> = {
  contable: ["Director Financiero y Administrativo"],
};

/**
 * Si esta gestión le esconde a este rol las solicitudes ajenas.
 *
 * Es la pregunta que de verdad hace `filtrarVisibles`: no basta con que la gestión sea
 * «solo propias», hay que mirar también quién pregunta.
 */
export const restringidaPara = (
  nombreRol?: string | null,
  gestion?: string | null,
): boolean => {
  const g = (gestion ?? "").trim();
  if (!gestionEsSoloPropia(g)) return false;
  return !(VEN_TODO_PESE_A_SOLO_PROPIAS[g] ?? []).includes((nombreRol ?? "").trim());
};

/**
 * Roles cuyo alcance no es «todas» ni «solo las mías», sino «las de cierta gente».
 *
 * Gerencia de Proyectos autoriza la contratación que piden los proyectos, y esa es toda
 * su parte: no tiene por qué ver la que tramita Administrativa para sí misma ni la de
 * áreas que no son suyas. Se define por **rol y no por persona** a propósito: la
 * condición es del cargo, así que si mañana lo ocupa alguien más, la regla lo sigue sin
 * que haya que acordarse de venir acá.
 *
 * La llave es el rol de quien mira; la lista, los roles de quienes crean.
 */
export const ALCANCE_POR_ROL: Record<string, readonly string[]> = {
  "Gerencia de Proyectos": [
    "Director de Proyecto Antioquia",
    "Director de Proyecto Putumayo",
    "Director de Proyecto Quindío",
    "Director de Proyecto Valle",
    "Director Técnico",
  ],
};

/** Los roles cuyas solicitudes alcanza a ver quien tiene este rol, o `null` si no aplica. */
export const alcanceDe = (nombreRol?: string | null): readonly string[] | null =>
  ALCANCE_POR_ROL[(nombreRol ?? "").trim()] ?? null;
