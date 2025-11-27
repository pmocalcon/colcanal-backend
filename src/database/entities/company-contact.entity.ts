import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { Project } from './project.entity';

@Entity('company_contacts')
export class CompanyContact {
  @PrimaryGeneratedColumn({ name: 'contact_id' })
  contactId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'project_id', nullable: true })
  projectId: number | null;

  @Column({ type: 'varchar', length: 20 })
  nit: string;

  @Column({ name: 'business_name', type: 'varchar', length: 200 })
  businessName: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ name: 'contact_person', type: 'varchar', length: 100, nullable: true })
  contactPerson: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Company, (company) => company.contacts)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Project, (project) => project.contacts, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;
}
