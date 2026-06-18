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
import { DirectorBudgetItem } from './director-budget-item.entity';

export enum DirectorBudgetStatus {
  DRAFT = 'draft',
  EN_REVISION = 'en_revision',
  FINAL = 'final',
}

@Entity('director_budgets')
export class DirectorBudget {
  @PrimaryGeneratedColumn({ name: 'budget_id' })
  budgetId: number;

  @Column({ name: 'work_id', nullable: true })
  workId: number;

  @Column({ name: 'department_name', type: 'varchar', length: 100, nullable: true })
  departmentName: string;

  @Column({ name: 'work_name', type: 'varchar', length: 255, nullable: true })
  workName: string;

  @Column({ name: 'company_name', type: 'varchar', length: 255, nullable: true })
  companyName: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ name: 'fuente_financiacion', type: 'varchar', length: 255, nullable: true })
  fuenteFinanciacion: string;

  @Column({ name: 'valor_minimo_excedentes', type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorMinimoExcedentes: number;

  @Column({ name: 'valor_actual_excedentes', type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorActualExcedentes: number;

  @Column({ name: 'saldo_disponible', type: 'decimal', precision: 15, scale: 2, nullable: true })
  saldoDisponible: number;

  @Column({ name: 'mano_de_obra', type: 'decimal', precision: 15, scale: 2, nullable: true })
  manoDeObra: number;

  @Column({ name: 'mano_de_obra_ej', type: 'decimal', precision: 15, scale: 2, nullable: true })
  manoDeObraEj: number;

  @Column({ name: 'materiales_inventario', type: 'decimal', precision: 15, scale: 2, nullable: true })
  materialesInventario: number;

  @Column({ name: 'materiales_inventario_ej', type: 'decimal', precision: 15, scale: 2, nullable: true })
  materialesInventarioEj: number;

  @Column({ name: 'valor_facturado', type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorFacturado: number;

  @Column({ name: 'valor_facturado_ej', type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorFacturadoEj: number;

  @Column({ name: 'otros_costos', type: 'decimal', precision: 15, scale: 2, nullable: true })
  otrosCostos: number;

  @Column({ name: 'otros_costos_ej', type: 'decimal', precision: 15, scale: 2, nullable: true })
  otrosCostosEj: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  leg: number;

  @Column({ name: 'leg_ej', type: 'decimal', precision: 15, scale: 2, nullable: true })
  legEj: number;

  @Column({ name: 'ret_pct', type: 'decimal', precision: 5, scale: 2, nullable: true })
  retPct: number;

  @Column({ name: 'ret_pct_ej', type: 'decimal', precision: 5, scale: 2, nullable: true })
  retPctEj: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: DirectorBudgetStatus.DRAFT,
  })
  status: DirectorBudgetStatus;

  @Column({ name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => DirectorBudgetItem, (item) => item.budget, { cascade: true })
  items: DirectorBudgetItem[];

  @ManyToOne(() => Work, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'work_id' })
  work: Work;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
