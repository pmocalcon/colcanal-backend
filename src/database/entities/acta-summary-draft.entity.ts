import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('acta_summary_drafts')
@Unique(['companyId', 'actaNumber'])
export class ActaSummaryDraft {
  @PrimaryGeneratedColumn({ name: 'summary_id' })
  summaryId: number;

  @Column({ name: 'company_id', type: 'int' })
  companyId: number;

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
