import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { User } from './user.entity';
import { PurchaseOrderItemApproval } from './purchase-order-item-approval.entity';

export enum ApprovalStatus {
  PENDING = 'pendiente',
  APPROVED = 'aprobado',
  REJECTED = 'rechazado',
}

@Entity('purchase_order_approvals')
export class PurchaseOrderApproval {
  @PrimaryGeneratedColumn({ name: 'approval_id' })
  approvalId: number;

  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: number;

  @Column({ name: 'approver_id' })
  approverId: number;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @Column({ name: 'comments', type: 'text', nullable: true })
  comments: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'approval_date', type: 'timestamp', nullable: true })
  approvalDate: Date | null;

  @Column({ name: 'deadline', type: 'timestamp' })
  deadline: Date;

  @Column({ name: 'is_overdue', type: 'boolean', default: false })
  isOverdue: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => PurchaseOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approver_id' })
  approver: User;

  // Aprobaciones individuales de items de esta orden de compra
  @OneToMany(() => PurchaseOrderItemApproval, (itemApproval) => itemApproval.purchaseOrderApproval)
  itemApprovals: PurchaseOrderItemApproval[];
}
