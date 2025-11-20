import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { Company } from './company.entity';
import { OperationCenter } from './operation-center.entity';
import { ProjectCode } from './project-code.entity';
import { RequisitionPrefix } from './requisition-prefix.entity';

@Entity('projects')
@Unique(['companyId', 'name'])
export class Project {
  @PrimaryGeneratedColumn({ name: 'project_id' })
  projectId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ type: 'text' })
  name: string;

  @ManyToOne(() => Company, (company) => company.projects)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => OperationCenter, (center) => center.project)
  operationCenters: OperationCenter[];

  @OneToMany(() => ProjectCode, (code) => code.project)
  projectCodes: ProjectCode[];

  @OneToMany(() => RequisitionPrefix, (prefix) => prefix.project)
  requisitionPrefixes: RequisitionPrefix[];
}
