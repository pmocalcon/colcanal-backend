import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum AnnualPlanReviewStatus {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
}

@Entity('annual_plan_reviews')
@Unique(['year', 'municipio', 'zone'])
export class AnnualPlanReview {
  @PrimaryGeneratedColumn({ name: 'review_id' })
  reviewId: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', length: 150 })
  municipio: string;

  @Column({ type: 'varchar', length: 80, default: 'all' })
  zone: string;

  @Column({ type: 'varchar', length: 20, default: AnnualPlanReviewStatus.PENDIENTE })
  status: AnnualPlanReviewStatus;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy: number | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
