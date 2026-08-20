import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum ActaStatus {
  BORRADOR = 'borrador',
  EN_REVISION = 'en_revision',
  EN_APROBACION = 'en_aprobacion',
  APROBADA = 'aprobada',
}

// Estado del presupuesto del acta (eje financiero, lo gestiona la Directora Financiera).
export enum ActaBudgetStatus {
  PENDIENTE = 'pendiente',
  EN_REVISION = 'en_revision',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
}

// Estado del plan del cronograma del acta. El Director de Proyecto lo arma y lo envía
// a revisión; el Director Técnico aprueba (habilita ejecución) o rechaza con motivo.
export enum ActaCronogramaStatus {
  PENDIENTE = 'pendiente',
  EN_REVISION = 'en_revision',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
}

/**
 * Permiso para comprar materiales contra un acta que todavía no se ha tramitado.
 *
 * Lo pide Gerencia de Proyectos sobre un acta provisional y lo autoriza Gerencia.
 * Es lo único que habilita crear una requisición sin código de contabilidad, así
 * que vive aparte de los otros tres ejes del acta: no depende de ellos ni los mueve.
 */
export enum ActaRqAnticipadaStatus {
  /** Nadie ha pedido comprar por anticipado contra esta acta. */
  NO_APLICA = 'no_aplica',
  PENDIENTE = 'pendiente',
  APROBADA = 'aprobada',
  RECHAZADA = 'rechazada',
}

// El número de acta (ej. "01-2026") se reutiliza entre municipios. La identidad real
// del acta es (empresa, proyecto, número): en Canales & Contactos el municipio es el
// proyecto, así que un mismo número en municipios distintos son actas distintas.
// project_id es nullable (las empresas sin proyecto usan NULL).
/**
 * Acta que agrupa obras (empresa, proyecto, número): estado del acta, del presupuesto y del cronograma, y su código de contabilidad.
 */
@Entity('work_actas')
@Unique(['companyId', 'projectId', 'actaNumber'])
export class WorkActa {
  @PrimaryGeneratedColumn({ name: 'acta_id' })
  actaId: number;

  @Column({ name: 'company_id', type: 'int' })
  companyId: number;

  @Column({ name: 'project_id', type: 'int', nullable: true })
  projectId: number | null;

  @Column({ name: 'acta_number', type: 'varchar', length: 100 })
  actaNumber: string;

  @Column({ type: 'varchar', length: 50, default: ActaStatus.BORRADOR })
  status: ActaStatus;

  @Column({ name: 'presupuesto_status', type: 'varchar', length: 20, default: ActaBudgetStatus.PENDIENTE })
  presupuestoStatus: ActaBudgetStatus;

  // Motivo cuando la Directora Financiera rechaza el presupuesto del acta.
  @Column({ name: 'presupuesto_rechazo_motivo', type: 'text', nullable: true })
  presupuestoRechazoMotivo: string | null;

  // Estado del plan del cronograma (Director de Proyecto → Director Técnico).
  @Column({ name: 'cronograma_status', type: 'varchar', length: 20, default: ActaCronogramaStatus.PENDIENTE })
  cronogramaStatus: ActaCronogramaStatus;

  // Motivo cuando el Director Técnico rechaza el plan del cronograma.
  @Column({ name: 'cronograma_rechazo_motivo', type: 'text', nullable: true })
  cronogramaRechazoMotivo: string | null;

  @Column({ name: 'cronograma_reviewed_by', type: 'int', nullable: true })
  cronogramaReviewedBy: number | null;

  @Column({ name: 'cronograma_reviewed_at', type: 'timestamptz', nullable: true })
  cronogramaReviewedAt: Date | null;

  // ── Acta provisional ────────────────────────────────────────────────────
  /**
   * El número lo puso Gerencia de Proyectos para agrupar obras sueltas antes de
   * que el acta se tramitara. Se cae solo al aprobarse el acta con su código:
   * desde ahí es un acta como cualquier otra.
   */
  @Column({ name: 'es_provisional', type: 'boolean', default: false })
  esProvisional: boolean;

  /** Permiso de Gerencia para comprar contra esta acta sin código todavía. */
  @Column({
    name: 'rq_anticipada_status',
    type: 'varchar',
    length: 20,
    default: ActaRqAnticipadaStatus.NO_APLICA,
  })
  rqAnticipadaStatus: ActaRqAnticipadaStatus;

  /** Por qué hay que comprar antes de tramitar el acta. Lo escribe quien solicita. */
  @Column({ name: 'rq_anticipada_justificacion', type: 'text', nullable: true })
  rqAnticipadaJustificacion: string | null;

  /** Motivo cuando Gerencia niega el permiso. */
  @Column({ name: 'rq_anticipada_motivo', type: 'text', nullable: true })
  rqAnticipadaMotivo: string | null;

  @Column({ name: 'rq_anticipada_solicitada_por', type: 'int', nullable: true })
  rqAnticipadaSolicitadaPor: number | null;

  @Column({ name: 'rq_anticipada_solicitada_at', type: 'timestamptz', nullable: true })
  rqAnticipadaSolicitadaAt: Date | null;

  @Column({ name: 'rq_anticipada_resuelta_por', type: 'int', nullable: true })
  rqAnticipadaResueltaPor: number | null;

  @Column({ name: 'rq_anticipada_resuelta_at', type: 'timestamptz', nullable: true })
  rqAnticipadaResueltaAt: Date | null;

  @Column({ name: 'project_code', type: 'varchar', length: 100, nullable: true })
  projectCode: string | null;

  @Column({ name: 'created_by', type: 'int' })
  createdBy: number;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy: number | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejection_comment', type: 'text', nullable: true })
  rejectionComment: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
