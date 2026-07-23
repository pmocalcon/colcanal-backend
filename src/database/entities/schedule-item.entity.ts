import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Schedule } from './schedule.entity';
import { Ucap } from './ucap.entity';

/**
 * Ítem de un cronograma: UCAP con su cantidad ejecutada y fechas.
 */
@Entity('schedule_items')
@Unique(['scheduleId', 'ucapId'])
export class ScheduleItem {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  itemId: number;

  @Column({ name: 'schedule_id' })
  scheduleId: number;

  @Column({ name: 'ucap_id' })
  ucapId: number;

  @Column({
    name: 'executed_quantity',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  executedQuantity: number;

  @Column({ name: 'ucap_start_date', type: 'date', nullable: true })
  ucapStartDate: string | null;

  @Column({ name: 'ucap_end_date', type: 'date', nullable: true })
  ucapEndDate: string | null;

  @ManyToOne(() => Schedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;

  @ManyToOne(() => Ucap)
  @JoinColumn({ name: 'ucap_id' })
  ucap: Ucap;
}
