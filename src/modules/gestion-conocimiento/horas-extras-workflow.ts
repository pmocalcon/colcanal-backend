/**
 * Máquina de estados de la planilla de Horas Extras (G. de talento humano, GTH-016-F).
 *
 *   Borrador (la registra el PQRS)
 *     → Revisión del Director de Proyecto
 *     → Aprobación de Gerencia de Proyectos (Lorena)
 *     → Aprobación de Dirección Administrativa (Daniela)
 *     → Aprobado
 *
 * Es el único formato de la gestión con **cuatro** manos: la planilla mueve dinero de
 * nómina, así que la revisa quien conoce la operación del municipio, la avala Proyectos
 * y la cierra Administrativa, que es la que paga.
 *
 * A diferencia del permiso, los pasos van por **rol** y no por la tabla de
 * autorizaciones: aquí el negocio nombró los cargos —los Directores de Proyecto,
 * Gerencia de Proyectos, Dirección Administrativa— y no la jerarquía de cada persona.
 *
 * Los rechazos devuelven al borrador con motivo, para que se corrija y se reenvíe.
 * Los SLA están en días hábiles.
 */

export const HORAS_EXTRAS_ESTADOS = {
  borrador: { label: 'Borrador', sla: null as number | null },
  pendiente_director_proyecto: { label: 'Pendiente de revisión del Director de Proyecto', sla: 2 },
  pendiente_gerencia_proyectos: { label: 'Pendiente de aprobación de Gerencia de Proyectos', sla: 2 },
  pendiente_direccion_administrativa: { label: 'Pendiente de aprobación de Dirección Administrativa', sla: 2 },
  aprobado: { label: 'Aprobada', sla: null as number | null },
} as const;

export type HorasExtrasEstado = keyof typeof HORAS_EXTRAS_ESTADOS;

/** Los cuatro Directores de Proyecto: revisan la planilla de su operación. */
export const ROLES_DIRECTOR_PROYECTO = [
  'Director de Proyecto Antioquia',
  'Director de Proyecto Quindío',
  'Director de Proyecto Valle',
  'Director de Proyecto Putumayo',
];
/** Gerencia de Proyectos (Lorena Martínez). */
export const ROL_GERENCIA_PROYECTOS = 'Gerencia de Proyectos';
/** Dirección Administrativa (Daniela Swann), que cierra y paga. */
export const ROL_ADMINISTRATIVA = 'Director Financiero y Administrativo';

export interface HorasExtrasTransicion {
  from: HorasExtrasEstado;
  to: HorasExtrasEstado;
  /** Roles autorizados (además del PMO, que siempre puede). */
  roles: string[];
  soloCreador?: boolean;
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
  revisar: {
    from: 'pendiente_director_proyecto',
    to: 'pendiente_gerencia_proyectos',
    roles: ROLES_DIRECTOR_PROYECTO,
    label: 'Revisar y enviar a Gerencia de Proyectos',
  },
  devolver_director: {
    from: 'pendiente_director_proyecto',
    to: 'borrador',
    roles: ROLES_DIRECTOR_PROYECTO,
    requiereMotivo: true,
    label: 'Devolver para corrección',
  },
  aprobar_gp: {
    from: 'pendiente_gerencia_proyectos',
    to: 'pendiente_direccion_administrativa',
    roles: [ROL_GERENCIA_PROYECTOS],
    label: 'Aprobar y enviar a Dirección Administrativa',
  },
  rechazar_gp: {
    from: 'pendiente_gerencia_proyectos',
    to: 'borrador',
    roles: [ROL_GERENCIA_PROYECTOS],
    requiereMotivo: true,
    label: 'Devolver la planilla',
  },
  aprobar_administrativa: {
    from: 'pendiente_direccion_administrativa',
    to: 'aprobado',
    roles: [ROL_ADMINISTRATIVA],
    label: 'Aprobar la planilla',
  },
  rechazar_administrativa: {
    from: 'pendiente_direccion_administrativa',
    to: 'borrador',
    roles: [ROL_ADMINISTRATIVA],
    requiereMotivo: true,
    label: 'Devolver la planilla',
  },
};

/** A quién se le notifica al llegar a cada estado. 'creador' = quien registró la planilla. */
export const HORAS_EXTRAS_NOTIFICAR_AL_LLEGAR: Record<
  HorasExtrasEstado,
  string[] | 'creador'
> = {
  borrador: 'creador',
  pendiente_director_proyecto: ROLES_DIRECTOR_PROYECTO,
  pendiente_gerencia_proyectos: [ROL_GERENCIA_PROYECTOS],
  pendiente_direccion_administrativa: [ROL_ADMINISTRATIVA],
  aprobado: 'creador',
};

/** Qué firma queda estampada en cada paso, para dejar constancia de quién avaló qué. */
export const HORAS_EXTRAS_FIRMA_POR_ACCION: Record<string, { nombre: string; fecha: string }> = {
  revisar: { nombre: 'revisadoPor', fecha: 'fechaRevision' },
  aprobar_gp: { nombre: 'aprobadoGpPor', fecha: 'fechaAprobacionGp' },
  aprobar_administrativa: { nombre: 'aprobadoAdminPor', fecha: 'fechaAprobacionAdmin' },
};
