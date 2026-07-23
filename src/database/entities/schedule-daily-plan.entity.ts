import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Schedule } from './schedule.entity';
import { Ucap } from './ucap.entity';

/**
 * Plan diario de un cronograma: cantidad planeada vs ejecutada de una UCAP en una fecha.
 */
@Entity('schedule_daily_plans')
@Unique(['scheduleId', 'ucapId', 'planDate'])
export class ScheduleDailyPlan {
  @PrimaryGeneratedColumn({ name: 'plan_id' })
  planId: number;

  @Column({ name: 'schedule_id' })
  scheduleId: number;

  @Column({ name: 'ucap_id' })
  ucapId: number;

  @Column({ name: 'plan_date', type: 'date' })
  planDate: string;

  @Column({ name: 'planned_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  plannedQuantity: number;

  @Column({ name: 'executed_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  executedQuantity: number;

  @ManyToOne(() => Schedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;

  @ManyToOne(() => Ucap)
  @JoinColumn({ name: 'ucap_id' })
  ucap: Ucap;
}
