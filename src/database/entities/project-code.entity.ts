import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { Project } from './project.entity';
import { Requisition } from './requisition.entity';

@Entity('project_codes')
export class ProjectCode {
  @PrimaryGeneratedColumn({ name: 'code_id' })
  codeId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'project_id', nullable: true })
  projectId: number;

  @Column({ type: 'text', nullable: true })
  code: string;

  @ManyToOne(() => Company, (company) => company.projectCodes)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Project, (project) => project.projectCodes, {
    nullable: true,
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => Requisition, (requisition) => requisition.projectCode)
  requisitions: Requisition[];
}
