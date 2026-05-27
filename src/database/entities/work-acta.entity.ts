import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ActaStatus {
  BORRADOR = 'borrador',
  EN_REVISION = 'en_revision',
  EN_APROBACION = 'en_aprobacion',
  APROBADA = 'aprobada',
}

@Entity('work_actas')
export class WorkActa {
  @PrimaryGeneratedColumn({ name: 'acta_id' })
  actaId: number;

  @Column({ name: 'acta_number', type: 'varchar', length: 100, unique: true })
  actaNumber: string;

  @Column({ type: 'varchar', length: 50, default: ActaStatus.BORRADOR })
  status: ActaStatus;

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
