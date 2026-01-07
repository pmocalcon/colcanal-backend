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
import { Work } from './work.entity';
import { User } from './user.entity';
import { SurveyBudgetItem } from './survey-budget-item.entity';
import { SurveyInvestmentItem } from './survey-investment-item.entity';
import { SurveyMaterial } from './survey-material.entity';
import { SurveyTravelExpense } from './survey-travel-expense.entity';

export enum SurveyStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn({ name: 'survey_id' })
  surveyId: number;

  @Column({ name: 'work_id' })
  workId: number;

  @Column({ name: 'project_code', type: 'varchar', length: 50 })
  projectCode: string;

  @Column({ name: 'request_date', type: 'date', nullable: true })
  requestDate: Date;

  @Column({ name: 'survey_date', type: 'date', nullable: true })
  surveyDate: Date;

  @Column({ name: 'received_by', type: 'varchar', length: 255, nullable: true })
  receivedBy: string;

  @Column({ name: 'assigned_reviewer_id', nullable: true })
  assignedReviewerId: number;

  @Column({ name: 'previous_month_ipp', type: 'decimal', precision: 10, scale: 2, nullable: true })
  previousMonthIpp: number;

  @Column({ name: 'requires_photometric_studies', type: 'boolean', default: false })
  requiresPhotometricStudies: boolean;

  @Column({ name: 'requires_retie_certification', type: 'boolean', default: false })
  requiresRetieCertification: boolean;

  @Column({ name: 'requires_retilap_certification', type: 'boolean', default: false })
  requiresRetilapCertification: boolean;

  @Column({ name: 'requires_civil_work', type: 'boolean', default: false })
  requiresCivilWork: boolean;

  @Column({
    type: 'enum',
    enum: SurveyStatus,
    default: SurveyStatus.PENDING,
  })
  status: SurveyStatus;

  @Column({ name: 'created_by' })
  createdBy: number;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: number;

  @Column({ name: 'review_date', type: 'timestamptz', nullable: true })
  reviewDate: Date;

  @Column({ name: 'rejection_comments', type: 'text', nullable: true })
  rejectionComments: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Work)
  @JoinColumn({ name: 'work_id' })
  work: Work;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_reviewer_id' })
  assignedReviewer: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @OneToMany(() => SurveyBudgetItem, (item) => item.survey, { cascade: true })
  budgetItems: SurveyBudgetItem[];

  @OneToMany(() => SurveyInvestmentItem, (item) => item.survey, { cascade: true })
  investmentItems: SurveyInvestmentItem[];

  @OneToMany(() => SurveyMaterial, (item) => item.survey, { cascade: true })
  materials: SurveyMaterial[];

  @OneToMany(() => SurveyTravelExpense, (item) => item.survey, { cascade: true })
  travelExpenses: SurveyTravelExpense[];
}
