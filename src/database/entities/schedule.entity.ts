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
import { ScheduleItem } from './schedule-item.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn({ name: 'schedule_id' })
  scheduleId: number;

  @Column({ name: 'work_id', unique: true })
  workId: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'contractual_start', type: 'date', nullable: true })
  contractualStart: string | null;

  @Column({ name: 'contractual_end', type: 'date', nullable: true })
  contractualEnd: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Work)
  @JoinColumn({ name: 'work_id' })
  work: Work;

  @OneToMany(() => ScheduleItem, (item) => item.schedule, { cascade: true })
  items: ScheduleItem[];
}
