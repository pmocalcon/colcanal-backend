import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Requisition } from './requisition.entity';
import { User } from './user.entity';

@Entity('requisition_logs')
export class RequisitionLog {
  @PrimaryGeneratedColumn({ name: 'log_id' })
  logId: number;

  @Column({ name: 'requisition_id' })
  requisitionId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  action: string;

  @Column({ name: 'previous_status', type: 'varchar', length: 50, nullable: true })
  previousStatus: string;

  @Column({ name: 'new_status', type: 'varchar', length: 50, nullable: true })
  newStatus: string;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // Relaciones
  @ManyToOne(() => Requisition, (requisition) => requisition.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requisition_id' })
  requisition: Requisition;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
