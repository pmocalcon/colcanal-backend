import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

// El borrador del "Resumen de Acta" comparte la identidad del acta:
// (empresa, proyecto, número). project_id es nullable.
@Entity('acta_summary_drafts')
@Unique(['companyId', 'projectId', 'actaNumber'])
export class ActaSummaryDraft {
  @PrimaryGeneratedColumn({ name: 'summary_id' })
  summaryId: number;

  @Column({ name: 'company_id', type: 'int' })
  companyId: number;

  @Column({ name: 'project_id', type: 'int', nullable: true })
  projectId: number | null;

  @Column({ name: 'acta_number', type: 'varchar', length: 100 })
  actaNumber: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
