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
import { User } from './user.entity';
import { Survey } from './survey.entity';

@Entity('works')
export class Work {
  @PrimaryGeneratedColumn({ name: 'work_id' })
  workId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'project_id', nullable: true })
  projectId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ name: 'neighborhood', type: 'varchar', length: 255, nullable: true })
  neighborhood: string;

  @Column({ name: 'sector_village', type: 'varchar', length: 255, nullable: true })
  sectorVillage: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  zone: string;

  @Column({ name: 'area_type', type: 'varchar', length: 100, nullable: true })
  areaType: string;

  @Column({ name: 'request_type', type: 'varchar', length: 100, nullable: true })
  requestType: string;

  @Column({ name: 'record_number', type: 'varchar', length: 50, nullable: true })
  recordNumber: string;

  @Column({ name: 'work_code', type: 'varchar', length: 50, nullable: true })
  workCode: string;

  @Column({ name: 'user_name', type: 'varchar', length: 255, nullable: true })
  userName: string;

  @Column({ name: 'requesting_entity', type: 'varchar', length: 255, nullable: true })
  requestingEntity: string;

  @Column({ name: 'user_address', type: 'varchar', length: 255, nullable: true })
  userAddress: string;

  @Column({ name: 'filing_number', type: 'varchar', length: 50, nullable: true })
  filingNumber: string;

  @Column({ name: 'created_by' })
  createdBy: number;

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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => Survey, (survey) => survey.work)
  surveys: Survey[];
}
