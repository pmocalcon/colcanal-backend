import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Company } from './company.entity';
import { Project } from './project.entity';

@Entity('survey_reviewer_access')
export class SurveyReviewerAccess {
  @PrimaryGeneratedColumn({ name: 'access_id' })
  accessId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'company_id', nullable: true })
  companyId: number | null;

  @Column({ name: 'project_id', nullable: true })
  projectId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Company, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
