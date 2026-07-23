import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Schedule } from './schedule.entity';

/**
 * Registro de material usado en un cronograma (código, cantidad, fecha).
 */
@Entity('schedule_material_logs')
export class ScheduleMaterialLog {
  @PrimaryGeneratedColumn({ name: 'log_id' })
  logId: number;

  @Column({ name: 'schedule_id' })
  scheduleId: number;

  @Column({ name: 'material_code', type: 'varchar', length: 50 })
  materialCode: string;

  @Column({ name: 'material_description', type: 'text', nullable: true })
  materialDescription: string | null;

  @Column({ name: 'unit_of_measure', type: 'varchar', length: 50, nullable: true })
  unitOfMeasure: string | null;

  @Column({ name: 'quantity', type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ name: 'usage_date', type: 'date' })
  usageDate: string;

  @ManyToOne(() => Schedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;
}
