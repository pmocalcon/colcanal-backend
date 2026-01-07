import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Company } from './company.entity';
import { Project } from './project.entity';

@Entity('ucaps')
export class Ucap {
  @PrimaryGeneratedColumn({ name: 'ucap_id' })
  ucapId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'project_id', nullable: true })
  projectId: number;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'rounded_value', type: 'decimal', precision: 15, scale: 2 })
  roundedValue: number;

  @Column({ name: 'initial_ipp', type: 'decimal', precision: 10, scale: 2 })
  initialIpp: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
