import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Project } from './project.entity';
import { OperationCenter } from './operation-center.entity';
import { ProjectCode } from './project-code.entity';
import { RequisitionPrefix } from './requisition-prefix.entity';
import { CompanyContact } from './company-contact.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn({ name: 'company_id' })
  companyId: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  abbreviation: string;

  @Column({ name: 'ipp_base_year', type: 'int', nullable: true })
  ippBaseYear: number;

  @Column({ name: 'ipp_base_month', type: 'int', nullable: true })
  ippBaseMonth: number;

  @Column({ name: 'ipp_initial_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  ippInitialValue: number;

  @OneToMany(() => Project, (project) => project.company)
  projects: Project[];

  @OneToMany(() => OperationCenter, (center) => center.company)
  operationCenters: OperationCenter[];

  @OneToMany(() => ProjectCode, (code) => code.company)
  projectCodes: ProjectCode[];

  @OneToMany(() => RequisitionPrefix, (prefix) => prefix.company)
  requisitionPrefixes: RequisitionPrefix[];

  @OneToMany(() => CompanyContact, (contact) => contact.company)
  contacts: CompanyContact[];
}
