/**
 * Máquina de estados de la Solicitud de Permiso (G. de talento humano, GTH-009-F).
 *
 *   Borrador → Pendiente de aprobación del jefe de área → Aprobado
 *
 * Quién es "el jefe" no lo decide un rol fijo sino la tabla `autorizaciones`, la misma
 * con la que Compras resuelve quién revisa una requisición: el Analista PMO lo aprueba
 * el Director PMO, el Analista Comercial la Directora Comercial, y así con cada área.
 * Por eso el paso no lleva `roles`: lleva `jefeAutorizador`.
 *
 * Quien no tenga autorizador —hoy Gerencia y Contabilidad— cae en la Gerencia, para que
 * su permiso no quede sin nadie que pueda resolverlo.
 *
 * El rechazo devuelve al borrador con motivo, igual que en los demás formatos.
 */

export const PERMISO_ESTADOS = {
  borrador: { label: 'Borrador', sla: null as number | null },
  pendiente_jefe: { label: 'Pendiente de aprobación del jefe de área', sla: 1 },
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

export const PERMISO_TRANSICIONES: Record<string, PermisoTransicion> = {
  enviar: {
    from: 'borrador',
    to: 'pendiente_jefe',
    roles: [],
    soloCreador: true,
    label: 'Enviar a aprobación',
  },
  aprobar_jefe: {
    from: 'pendiente_jefe',
    to: 'aprobado',
    roles: [],
    jefeAutorizador: true,
    label: 'Aprobar el permiso',
  },
  rechazar_jefe: {
    from: 'pendiente_jefe',
    to: 'borrador',
    roles: [],
    jefeAutorizador: true,
    requiereMotivo: true,
    label: 'Negar el permiso',
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

/**
 * A quién se le notifica al llegar a cada estado. 'jefe' = los autorizadores del
 * creador; 'creador' = quien pidió el permiso.
 */
export const PERMISO_NOTIFICAR_AL_LLEGAR: Record<PermisoEstado, 'creador' | 'jefe'> = {
  borrador: 'creador',
  pendiente_jefe: 'jefe',
  aprobado: 'creador',
};
