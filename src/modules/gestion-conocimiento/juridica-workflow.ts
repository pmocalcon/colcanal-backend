/**
 * Máquina de estados del flujo de G. jurídica (fase 1: hasta el contrato firmado).
 * Fuente: esquema del proceso.
 *   Solicitud RQ → autoriza Gerencia de Proyectos ("Autorizado por")
 *   → firma la solicitud Gerencia (Dra. Gloria, "Aprobado por")
 *   → Tramitar RQ (Administrativa/AD): documentos, remisión, valida campos
 *   → Generación/Revisión del contrato (Jurídica/JUR)
 *   → firma el contrato Gerencia (Dra. Gloria, en el formato del contrato).
 *
 * Fase 2 (post-firma): Designación de supervisor (JUR) → Acta de inicio (JUR) → finalizado.
 * Los SLA están en días hábiles.
 */

export const JURIDICA_ESTADOS = {
  borrador: { label: 'Borrador', sla: null as number | null },
  pendiente_autorizacion_gp: { label: 'Pendiente de autorización (Gerencia de Proyectos)', sla: 1 },
  pendiente_firma_gerencia: { label: 'Pendiente de firma de Gerencia (Dra. Gloria)', sla: 1 },
  en_tramite_administrativa: { label: 'En trámite (Administrativa)', sla: 3 },
  contrato_en_elaboracion: { label: 'Contrato en revisión (Jurídica)', sla: 3 },
  pendiente_firma_contrato: { label: 'Pendiente de firma del contrato', sla: 1 },
  contrato_firmado: { label: 'Contrato firmado', sla: null as number | null },
  // ── Pólizas (tras la firma del contrato) ────────────────
  en_solicitud_polizas: { label: 'Solicitud de pólizas (Administrativa)', sla: 1 },
  // Heredado: ya no se entra aquí. Se conserva para las solicitudes que quedaron
  // en este estado y para que su historial siga siendo legible.
  en_aprobacion_polizas: { label: 'Aprobación de pólizas (Jurídica)', sla: 1 },
  en_pago_polizas: { label: 'Pago de pólizas (Administrativa)', sla: 1 },
  // Verificación formal de la garantía recibida, ya pagada: tomador, asegurado, objeto,
  // amparos, vigencias y prima. Va antes de designar supervisor porque un contrato no
  // debería arrancar con una póliza que no corresponde.
  en_verificacion_garantias: { label: 'Verificación de garantías (Jurídica)', sla: 2 },
  // ── Fase 2 ──────────────────────────────────────────────
  en_designacion_supervisor: { label: 'Designación de supervisor (Jurídica)', sla: 2 },
  en_acta_inicio: { label: 'Acta de inicio (Jurídica)', sla: 2 },
  finalizado: { label: 'Contrato en ejecución', sla: null as number | null },
} as const;

export type JuridicaEstado = keyof typeof JURIDICA_ESTADOS;

/**
 * Los estados en el orden en que ocurren. `JURIDICA_ESTADOS` se declara siguiendo el
 * flujo, así que de ahí sale sin repetir la lista.
 */
export const ORDEN_ESTADOS = Object.keys(JURIDICA_ESTADOS) as JuridicaEstado[];

/** ¿El trámite ya pasó por `desde` (o está en él)? Falso si el estado no existe. */
export const estadoAlcanzo = (estado: string, desde: JuridicaEstado): boolean => {
  const i = ORDEN_ESTADOS.indexOf(estado as JuridicaEstado);
  return i >= 0 && i >= ORDEN_ESTADOS.indexOf(desde);
};

/** Administrativa (AD): tramita la RQ — documentos, remisión y validación de campos. */
export const ROLES_ADMINISTRATIVA = [
  'Director Financiero y Administrativo',
  'Analista Administrativo',
];

/** Jurídica (JUR): genera y revisa el contrato. */
export const ROLES_JURIDICA = [
  'Director Jurídico',
  'Coordinador Jurídico',
  'Analista Jurídico',
];

/** Gerencia de Proyectos autoriza la solicitud ("Autorizado por"). */
export const ROLES_GERENCIA_PROYECTOS = ['Gerencia de Proyectos'];

/** Gerencia aprueba/firma el contrato ("Aprobado por" · Dra. Gloria). */
export const ROLES_GERENCIA = ['Gerencia'];

/** Comodín transversal del sistema: Analista y Director PMO, con igual alcance. */
export { ROLES_PMO, esRolPmo } from '../../common/constants/roles.constants';

export interface Transicion {
  from: JuridicaEstado;
  to: JuridicaEstado;
  /** Roles autorizados (además del PMO, que siempre puede). */
  roles: string[];
  /** Si es true, solo el creador (o PMO) puede ejecutarla. */
  soloCreador?: boolean;
  /** Exige motivo (devoluciones/rechazos). */
  requiereMotivo?: boolean;
  label: string;
}

export const JURIDICA_TRANSICIONES: Record<string, Transicion> = {
  enviar: {
    from: 'borrador',
    to: 'pendiente_autorizacion_gp',
    roles: [],
    soloCreador: true,
    label: 'Enviar a autorización',
  },
  autorizar_gp: {
    from: 'pendiente_autorizacion_gp',
    to: 'pendiente_firma_gerencia',
    roles: ROLES_GERENCIA_PROYECTOS,
    label: 'Autorizar y enviar a firma de Gerencia',
  },
  rechazar_gp: {
    from: 'pendiente_autorizacion_gp',
    to: 'borrador',
    roles: ROLES_GERENCIA_PROYECTOS,
    requiereMotivo: true,
    label: 'Rechazar la solicitud',
  },
  aprobar_gerencia: {
    from: 'pendiente_firma_gerencia',
    to: 'en_tramite_administrativa',
    roles: ROLES_GERENCIA,
    label: 'Firmar y remitir a Administrativa',
  },
  rechazar_gerencia: {
    from: 'pendiente_firma_gerencia',
    to: 'borrador',
    roles: ROLES_GERENCIA,
    requiereMotivo: true,
    label: 'Rechazar la solicitud',
  },
  tramitar: {
    from: 'en_tramite_administrativa',
    to: 'contrato_en_elaboracion',
    roles: ROLES_ADMINISTRATIVA,
    label: 'Trámite validado · remitir a Jurídica',
  },
  devolver_tramite: {
    from: 'en_tramite_administrativa',
    to: 'borrador',
    roles: ROLES_ADMINISTRATIVA,
    requiereMotivo: true,
    label: 'Devolver (faltan documentos/campos)',
  },
  contrato_listo: {
    from: 'contrato_en_elaboracion',
    to: 'pendiente_firma_contrato',
    roles: ROLES_JURIDICA,
    label: 'Contrato listo · enviar a firma',
  },
  firmar_contrato: {
    from: 'pendiente_firma_contrato',
    to: 'contrato_firmado',
    roles: ROLES_GERENCIA,
    label: 'Firmar el contrato',
  },
  rechazar_contrato: {
    from: 'pendiente_firma_contrato',
    to: 'contrato_en_elaboracion',
    roles: ROLES_GERENCIA,
    requiereMotivo: true,
    label: 'Devolver el contrato a Jurídica',
  },

  // ── Pólizas (tras la firma del contrato) ────────────────
  // Al entrar a "en_solicitud_polizas" se crea automáticamente la requisición de
  // la póliza (ítem POLIZA) en Gestión de Compras (ver gestion-conocimiento.service).
  solicitar_polizas: {
    from: 'contrato_firmado',
    to: 'en_solicitud_polizas',
    roles: [...ROLES_ADMINISTRATIVA, ...ROLES_JURIDICA],
    label: 'Iniciar solicitud de pólizas',
  },
  // Jurídica no aprueba pólizas: la requisición sale directo a cotización por
  // Compras y de ahí a pago. Lo que Jurídica sí revisa es la garantía recibida,
  // más adelante, en "Verificación de garantías".
  polizas_solicitadas: {
    from: 'en_solicitud_polizas',
    to: 'en_pago_polizas',
    roles: ROLES_ADMINISTRATIVA,
    label: 'Póliza expedida · pasar a pago',
  },
  // Paso heredado: solicitudes que quedaron en "Aprobación de pólizas (Jurídica)"
  // antes de que el paso se eliminara. No entra ninguna nueva; la salida se
  // conserva para que las que estén ahí no queden trancadas.
  aprobar_polizas: {
    from: 'en_aprobacion_polizas',
    to: 'en_pago_polizas',
    roles: [...ROLES_ADMINISTRATIVA, ...ROLES_JURIDICA],
    label: 'Continuar · registrar el pago',
  },
  pagar_polizas: {
    from: 'en_pago_polizas',
    to: 'en_verificacion_garantias',
    roles: ROLES_ADMINISTRATIVA,
    label: 'Póliza pagada · verificar garantías',
  },

  // ── Verificación de garantías ───────────────────────────
  // Se diligencia la lista de verificación (17 ítems) y la matriz de riesgo contractual.
  garantias_verificadas: {
    from: 'en_verificacion_garantias',
    to: 'en_designacion_supervisor',
    roles: ROLES_JURIDICA,
    label: 'Garantías verificadas · designar supervisor',
  },
  devolver_garantias: {
    from: 'en_verificacion_garantias',
    // Vuelve a la solicitud de pólizas: si la garantía no corresponde (tomador,
    // objeto, vigencias), hay que pedirle otra a la aseguradora, no seguir.
    to: 'en_solicitud_polizas',
    roles: ROLES_JURIDICA,
    requiereMotivo: true,
    label: 'Devolver (la garantía no cumple)',
  },

  // ── Fase 2 ──────────────────────────────────────────────
  designar_supervisor: {
    from: 'en_designacion_supervisor',
    to: 'en_acta_inicio',
    roles: ROLES_JURIDICA,
    label: 'Supervisor designado · elaborar acta de inicio',
  },
  acta_inicio_lista: {
    from: 'en_acta_inicio',
    to: 'finalizado',
    roles: ROLES_JURIDICA,
    label: 'Acta de inicio firmada · finalizar',
  },
};

/** A quién se le notifica cuando la solicitud llega a cada estado (el que sigue actuando). */
export const NOTIFICAR_AL_LLEGAR: Record<JuridicaEstado, string[] | 'creador'> = {
  borrador: 'creador',
  pendiente_autorizacion_gp: ROLES_GERENCIA_PROYECTOS,
  pendiente_firma_gerencia: ROLES_GERENCIA,
  en_tramite_administrativa: ROLES_ADMINISTRATIVA,
  contrato_en_elaboracion: ROLES_JURIDICA,
  pendiente_firma_contrato: ROLES_GERENCIA,
  contrato_firmado: ROLES_ADMINISTRATIVA, // firmado → Administrativa inicia la solicitud de pólizas
  // ── Pólizas ──
  en_solicitud_polizas: ROLES_ADMINISTRATIVA,
  en_aprobacion_polizas: ROLES_JURIDICA,
  en_pago_polizas: ROLES_ADMINISTRATIVA,
  en_verificacion_garantias: ROLES_JURIDICA,
  // ── Fase 2 ──
  en_designacion_supervisor: ROLES_JURIDICA,
  en_acta_inicio: ROLES_JURIDICA,
  finalizado: 'creador',
};
