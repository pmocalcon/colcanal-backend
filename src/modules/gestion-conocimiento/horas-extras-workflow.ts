/**
 * Máquina de estados de la planilla de Horas Extras (G. de talento humano, GTH-016-F).
 *
 *   Borrador (la llena el PQRS)
 *     → Revisión del Director de Proyecto a cargo de ese PQRS
 *     → Revisión de Dirección Técnica (Andrés Gómez)
 *     → Aprobación de Gerencia de Proyectos (Lorena Martínez)
 *     → Aprobada
 *
 * Cuatro manos, porque la planilla mueve dinero de nómina: la revisa quien conoce la
 * operación del municipio, la valida el área técnica y la aprueba Proyectos.
 *
 * El primer paso es el único del sistema que combina **rol y jerarquía**: no lo revisa
 * cualquier Director de Proyecto sino el que tiene a cargo a quien registró la planilla,
 * según la tabla de autorizaciones. Sin la parte de la jerarquía, el de Antioquia podría
 * revisar las horas de Putumayo; sin la parte del rol, Dirección Técnica y Gerencia
 * —que autorizan a todo el mundo— se saltarían su propio turno.
 *
 * Los rechazos devuelven al borrador con motivo. Los SLA están en días hábiles.
 */

export const HORAS_EXTRAS_ESTADOS = {
  borrador: { label: 'Borrador', sla: null as number | null },
  pendiente_director_proyecto: { label: 'Pendiente de revisión del Director de Proyecto', sla: 2 },
  pendiente_direccion_tecnica: { label: 'Pendiente de revisión de Dirección Técnica', sla: 2 },
  pendiente_gerencia_proyectos: { label: 'Pendiente de aprobación de Gerencia de Proyectos', sla: 2 },
  aprobado: { label: 'Aprobada', sla: null as number | null },
} as const;

export type HorasExtrasEstado = keyof typeof HORAS_EXTRAS_ESTADOS;

/** Los cuatro Directores de Proyecto. Revisa el que tenga a cargo a quien la registró. */
export const ROLES_DIRECTOR_PROYECTO = [
  'Director de Proyecto Antioquia',
  'Director de Proyecto Quindío',
  'Director de Proyecto Valle',
  'Director de Proyecto Putumayo',
];
/** Dirección Técnica (Andrés Gómez). */
export const ROL_DIRECCION_TECNICA = 'Director Técnico';
/** Gerencia de Proyectos (Lorena Martínez), que cierra el trámite. */
export const ROL_GERENCIA_PROYECTOS = 'Gerencia de Proyectos';
/**
 * Dirección Administrativa y Financiera (Daniela Swann). No aprueba: **recibe** la
 * planilla ya aprobada, que es lo que se liquida en nómina.
 */
export const ROL_ADMINISTRATIVA = 'Director Financiero y Administrativo';

export interface HorasExtrasTransicion {
  from: HorasExtrasEstado;
  to: HorasExtrasEstado;
  /** Roles autorizados (además del PMO, que siempre puede). */
  roles: string[];
  soloCreador?: boolean;
  /**
   * Exige además ser autorizador del creador. Se combina con `roles`: hay que cumplir
   * las dos cosas, no una u otra.
   */
  jefeAutorizador?: boolean;
  requiereMotivo?: boolean;
  label: string;
}

export const HORAS_EXTRAS_TRANSICIONES: Record<string, HorasExtrasTransicion> = {
  enviar: {
    from: 'borrador',
    to: 'pendiente_director_proyecto',
    roles: [],
    soloCreador: true,
    label: 'Enviar a revisión',
  },
  revisar_director: {
    from: 'pendiente_director_proyecto',
    to: 'pendiente_direccion_tecnica',
    roles: ROLES_DIRECTOR_PROYECTO,
    jefeAutorizador: true,
    label: 'Revisar y enviar a Dirección Técnica',
  },
  devolver_director: {
    from: 'pendiente_director_proyecto',
    to: 'borrador',
    roles: ROLES_DIRECTOR_PROYECTO,
    jefeAutorizador: true,
    requiereMotivo: true,
    label: 'Devolver para corrección',
  },
  revisar_tecnica: {
    from: 'pendiente_direccion_tecnica',
    to: 'pendiente_gerencia_proyectos',
    roles: [ROL_DIRECCION_TECNICA],
    label: 'Revisar y enviar a Gerencia de Proyectos',
  },
  devolver_tecnica: {
    from: 'pendiente_direccion_tecnica',
    to: 'borrador',
    roles: [ROL_DIRECCION_TECNICA],
    requiereMotivo: true,
    label: 'Devolver la planilla',
  },
  aprobar_gp: {
    from: 'pendiente_gerencia_proyectos',
    to: 'aprobado',
    roles: [ROL_GERENCIA_PROYECTOS],
    label: 'Aprobar la planilla',
  },
  rechazar_gp: {
    from: 'pendiente_gerencia_proyectos',
    to: 'borrador',
    roles: [ROL_GERENCIA_PROYECTOS],
    requiereMotivo: true,
    label: 'Devolver la planilla',
  },
};

/**
 * A quién se le avisa al llegar a cada estado. Es una lista porque un estado puede
 * tener más de un destinatario: al quedar aprobada le llega al trabajador que la
 * registró **y** a Dirección Administrativa, que es quien la liquida en nómina.
 *
 * Dos destinatarios no son un rol sino una relación, y por eso van como palabra:
 *  - 'creador' — quien registró la planilla.
 *  - 'director-a-cargo' — sus Directores de Proyecto en la tabla de autorizaciones,
 *    no los cuatro.
 * Cualquier otra cadena es un nombre de rol.
 */
export type DestinatarioHorasExtras = string | 'creador' | 'director-a-cargo';

export const HORAS_EXTRAS_NOTIFICAR_AL_LLEGAR: Record<
  HorasExtrasEstado,
  DestinatarioHorasExtras[]
> = {
  borrador: ['creador'],
  pendiente_director_proyecto: ['director-a-cargo'],
  pendiente_direccion_tecnica: [ROL_DIRECCION_TECNICA],
  pendiente_gerencia_proyectos: [ROL_GERENCIA_PROYECTOS],
  aprobado: ['creador', ROL_ADMINISTRATIVA],
};

/** Qué firma queda estampada en cada paso, para dejar constancia de quién avaló qué. */
export const HORAS_EXTRAS_FIRMA_POR_ACCION: Record<string, { nombre: string; fecha: string }> = {
  revisar_director: { nombre: 'revisadoPor', fecha: 'fechaRevision' },
  revisar_tecnica: { nombre: 'revisadoTecnicaPor', fecha: 'fechaRevisionTecnica' },
  aprobar_gp: { nombre: 'aprobadoGpPor', fecha: 'fechaAprobacionGp' },
};
