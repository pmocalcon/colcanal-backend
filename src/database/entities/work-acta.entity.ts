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

// El número de acta (ej. "01-2026") se reutiliza entre municipios. La identidad real
// del acta es (empresa, proyecto, número): en Canales & Contactos el municipio es el
// proyecto, así que un mismo número en municipios distintos son actas distintas.
// project_id es nullable (las empresas sin proyecto usan NULL).
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
