import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Company } from './company.entity';
import { Project } from './project.entity';
import { RequisitionSequence } from './requisition-sequence.entity';

@Entity('requisition_prefixes')
export class RequisitionPrefix {
  @PrimaryGeneratedColumn({ name: 'prefix_id' })
  prefixId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'project_id', nullable: true })
  projectId: number;

  @Column({ type: 'varchar', length: 10 })
  prefix: string;

  @ManyToOne(() => Company, (company) => company.requisitionPrefixes)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Project, (project) => project.requisitionPrefixes, {
    nullable: true,
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToOne(() => RequisitionSequence, (sequence) => sequence.requisitionPrefix)
  requisitionSequence: RequisitionSequence;
}
