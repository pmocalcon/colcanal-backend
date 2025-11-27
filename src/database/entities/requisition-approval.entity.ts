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
import { RequisitionStatus } from './requisition-status.entity';

@Entity('requisition_approvals')
export class RequisitionApproval {
  @PrimaryGeneratedColumn({ name: 'approval_id' })
  approvalId: number;

  @Column({ name: 'requisition_id' })
  requisitionId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'action', type: 'varchar', length: 20 })
  action: string; // 'approved', 'rejected', 'reviewed'

  @Column({ name: 'step_order', type: 'integer' })
  stepOrder: number; // Nivel de aprobación: 1, 2, 3...

  @Column({ name: 'previous_status_id', nullable: true })
  previousStatusId: number;

  @Column({ name: 'new_status_id' })
  newStatusId: number;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  // Relaciones
  @ManyToOne(() => Requisition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisition_id' })
  requisition: Requisition;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => RequisitionStatus, { nullable: true })
  @JoinColumn({ name: 'previous_status_id' })
  previousStatus: RequisitionStatus;

  @ManyToOne(() => RequisitionStatus)
  @JoinColumn({ name: 'new_status_id' })
  newStatus: RequisitionStatus;
}
