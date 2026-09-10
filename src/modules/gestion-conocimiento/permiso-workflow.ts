/**
 * Máquina de estados de la Solicitud de Permiso (G. de talento humano, GTH-010-F).
 *
 *   Borrador → Aprobación del jefe inmediato → Revisión de la Dir. Administrativa y
 *   Financiera → Aprobado (y aviso a Talento Humano)
 *
 * **Primero decide el jefe y después revisa la Dirección.** Quien sabe si la persona
 * puede faltar ese día es su jefe, no la Dirección: mandárselo antes a ella es pedirle
 * que revise el papeleo de un permiso que todavía puede negarse. Con este orden la
 * Dirección solo ve lo que ya está concedido.
 *
 * Quién es "el jefe" no lo decide un rol fijo sino la tabla `autorizaciones`, la misma
 * con la que Compras resuelve quién revisa una requisición: el Analista PMO lo aprueba
 * el Director PMO, el Analista Comercial la Directora Comercial, y así con cada área.
 * Por eso el paso no lleva `roles`: lleva `jefeAutorizador`.
 *
 * Quien no tenga autorizador —hoy Gerencia y Contabilidad— cae en la Gerencia, para que
 * su permiso no quede sin nadie que pueda resolverlo.
 *
 * Al quedar aprobado se le avisa al Coordinador de Talento Humano. No es un paso más:
 * no tiene nada que decidir y el trámite no lo espera. Se le avisa porque el permiso
 * aprobado nace como ausentismo y de ahí sale la nómina, así que es quien tiene que
 * enterarse de que la ausencia existe.
 *
 * El rechazo devuelve al borrador con motivo, igual que en los demás formatos.
 */

export const PERMISO_ESTADOS = {
  borrador: { label: 'Borrador', sla: null as number | null },
  pendiente_jefe: { label: 'Pendiente de aprobación del jefe inmediato', sla: 1 },
  pendiente_administrativa: {
    label: 'Pendiente de revisión de la Dir. Administrativa y Financiera',
    sla: 1,
  },
  aprobado: { label: 'Aprobado', sla: null as number | null },
} as const;

export type PermisoEstado = keyof typeof PERMISO_ESTADOS;

export interface PermisoTransicion {
  from: PermisoEstado;
  to: PermisoEstado;
  /** Roles autorizados (además del PMO, que siempre puede). Vacío en los pasos por jefe. */
  roles: string[];
  soloCreador?: boolean;
  /** El autorizador del creador en la tabla `autorizaciones`, o Gerencia si no tiene. */
  jefeAutorizador?: boolean;
  requiereMotivo?: boolean;
  label: string;
}

/** Quien revisa después del jefe: la Dirección Administrativa y Financiera (Daniela). */
export const ROL_ADMINISTRATIVA_PERMISO = 'Director Financiero y Administrativo';

/** A quien se le avisa del permiso ya aprobado, porque de ahí sale la nómina (Franco). */
export const ROL_TALENTO_HUMANO_PERMISO = 'Coordinador Talento Humano';

export const PERMISO_TRANSICIONES: Record<string, PermisoTransicion> = {
  enviar: {
    from: 'borrador',
    to: 'pendiente_jefe',
    roles: [],
    soloCreador: true,
    label: 'Enviar al jefe inmediato',
  },
  aprobar_jefe: {
    from: 'pendiente_jefe',
    to: 'pendiente_administrativa',
    roles: [],
    jefeAutorizador: true,
    label: 'Aprobar y enviar a la Dir. Administrativa',
  },
  rechazar_jefe: {
    from: 'pendiente_jefe',
    to: 'borrador',
    roles: [],
    jefeAutorizador: true,
    requiereMotivo: true,
    label: 'Negar el permiso',
  },
  revisar_administrativa: {
    from: 'pendiente_administrativa',
    to: 'aprobado',
    roles: [ROL_ADMINISTRATIVA_PERMISO],
    label: 'Revisar y cerrar el permiso',
  },
  devolver_administrativa: {
    from: 'pendiente_administrativa',
    to: 'borrador',
    roles: [ROL_ADMINISTRATIVA_PERMISO],
    requiereMotivo: true,
    label: 'Devolver al empleado',
  },
};

/**
 * Qué filas del cuadro "Aprobación interna" firma cada rol, por `rol_id`.
 *
 * Va por id y no por nombre porque el nombre del rol lo puede cambiar cualquiera desde
 * Parámetros, y entonces la aprobación dejaría de marcar la casilla sin que nada falle.
 *
 * Son varias filas por rol y no una porque el papel tiene más filas que direcciones
 * tiene la empresa: «DIRECCIÓN OPERATIVA» es del Director Técnico, que además firma su
 * propia fila, así que al decidir marca las dos.
 *
 * Los roles que no estén aquí igual aprueban el permiso: lo único que no ocurre es que
 * se marque una casilla. Es deliberado — marcar la fila equivocada en un formato firmado
 * es peor que dejarla en blanco para que la diligencien a mano.
 *
 * Sigue sin asignar «DIRECCIÓN FINANCIERA»: la única dirección financiera de la empresa
 * es «Director Financiero y Administrativo», que ya tiene su propia fila.
 */
export const FILAS_APROBACION_POR_ROL: Record<number, string[]> = {
  4: ['comercial'],                  // Director Comercial
  5: ['juridica'],                   // Director Jurídico
  3: ['pmo'],                        // Director PMO
  2: ['gerencia-proyectos'],         // Gerencia de Proyectos
  6: ['tecnica', 'operativa'],       // Director Técnico: también la dirección operativa
  30: ['tics'],                      // Director Tics
  7: ['administrativa-financiera'],  // Director Financiero y Administrativo
  1: ['gerencia'],                   // Gerencia
};

/** A quién se le avisa cuando el permiso llega a un estado. */
export interface PermisoAviso {
  /** Quien pidió el permiso. */
  creador?: boolean;
  /** Los autorizadores del creador, resueltos con la tabla `autorizaciones`. */
  jefe?: boolean;
  /** Roles fijos, sean quienes sean el jefe y el solicitante. */
  roles?: readonly string[];
}

/**
 * A quién se le notifica al llegar a cada estado.
 *
 * No todos los avisos piden lo mismo. El del jefe y el de la Dirección son «te toca»;
 * el de Talento Humano al aprobarse es «entérate», porque el trámite ya terminó y no
 * espera nada de él. Quien manda el correo lo distingue por el estado.
 */
export const PERMISO_NOTIFICAR_AL_LLEGAR: Record<PermisoEstado, PermisoAviso> = {
  borrador: { creador: true },
  pendiente_jefe: { jefe: true },
  pendiente_administrativa: { roles: [ROL_ADMINISTRATIVA_PERMISO] },
  aprobado: { creador: true, roles: [ROL_TALENTO_HUMANO_PERMISO] },
};
