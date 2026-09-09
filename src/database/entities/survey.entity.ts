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

export enum BlockStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Levantamiento de una obra: fechas, revisor, IPP, certificaciones requeridas y sus ítems (presupuesto, inversión, materiales, viáticos).
 */
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

  // Opcional como los comentarios por bloque: aprobar limpia el motivo del rechazo
  // anterior, y la columna admite nulos desde siempre.
  @Column({ name: 'rejection_comments', type: 'text', nullable: true })
  rejectionComments?: string;

  /**
   * El revisor devolvió el levantamiento **entero**, sin señalar un bloque.
   *
   * Existe porque `status` se deriva de los cuatro bloques, y un rechazo que no marca
   * ninguno no tendría dónde quedar registrado: el cálculo vería cuatro bloques
   * pendientes y devolvería «en revisión», borrando la decisión. Es el caso de un
   * reparo que no es de una sección sino de todo el documento —el IPP, por ejemplo—,
   * y para ese no tiene sentido devolver las cuatro secciones marcadas.
   *
   * Se apaga en cuanto la revisión avanza por otro lado: al aprobar, al revisar un
   * bloque y al reabrir para edición.
   */
  @Column({ name: 'rechazo_general', type: 'boolean', default: false })
  rechazoGeneral: boolean;

  // Block-level review status
  @Column({
    name: 'budget_status',
    type: 'enum',
    enum: BlockStatus,
    default: BlockStatus.PENDING,
  })
  budgetStatus: BlockStatus;

  @Column({ name: 'budget_comments', type: 'text', nullable: true })
  budgetComments?: string;

  @Column({
    name: 'investment_status',
    type: 'enum',
    enum: BlockStatus,
    default: BlockStatus.PENDING,
  })
  investmentStatus: BlockStatus;

  @Column({ name: 'investment_comments', type: 'text', nullable: true })
  investmentComments?: string;

  @Column({
    name: 'materials_status',
    type: 'enum',
    enum: BlockStatus,
    default: BlockStatus.PENDING,
  })
  materialsStatus: BlockStatus;

  @Column({ name: 'materials_comments', type: 'text', nullable: true })
  materialsComments?: string;

  @Column({
    name: 'travel_expenses_status',
    type: 'enum',
    enum: BlockStatus,
    default: BlockStatus.PENDING,
  })
  travelExpensesStatus: BlockStatus;

  @Column({ name: 'travel_expenses_comments', type: 'text', nullable: true })
  travelExpensesComments?: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  // Enlaces de SharePoint: pasan de 500 caracteres con facilidad, porque llevan
  // el id del documento y los parámetros de compartir (?d=w...&csf=1&web=1&e=...).
  @Column({ name: 'sketch_url', type: 'text', nullable: true })
  sketchUrl: string;

  @Column({ name: 'map_url', type: 'text', nullable: true })
  mapUrl: string;

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
  materialItems: SurveyMaterial[];

  @OneToMany(() => SurveyTravelExpense, (item) => item.survey, { cascade: true })
  travelExpenses: SurveyTravelExpense[];
}
