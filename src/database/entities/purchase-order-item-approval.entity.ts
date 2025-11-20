import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { PurchaseOrderApproval } from './purchase-order-approval.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

export enum ItemApprovalStatus {
  PENDING = 'pendiente',
  APPROVED = 'aprobado',
  REJECTED = 'rechazado',
}

@Entity('purchase_order_item_approvals')
export class PurchaseOrderItemApproval {
  @PrimaryGeneratedColumn({ name: 'item_approval_id' })
  itemApprovalId: number;

  @Column({ name: 'po_approval_id' })
  poApprovalId: number;

  @Column({ name: 'po_item_id' })
  poItemId: number;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ItemApprovalStatus,
    default: ItemApprovalStatus.PENDING,
  })
  approvalStatus: ItemApprovalStatus;

  @Column({ name: 'comments', type: 'text', nullable: true })
  comments: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => PurchaseOrderApproval, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'po_approval_id' })
  purchaseOrderApproval: PurchaseOrderApproval;

  @ManyToOne(() => PurchaseOrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'po_item_id' })
  purchaseOrderItem: PurchaseOrderItem;
}
