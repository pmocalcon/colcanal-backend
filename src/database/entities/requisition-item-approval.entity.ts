import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Requisition } from './requisition.entity';
import { RequisitionItem } from './requisition-item.entity';
import { User } from './user.entity';
import { Material } from './material.entity';

/**
 * Tracks item-level approvals for requisitions
 * Allows saving approval state per item so when items are rejected and corrected,
 * previously approved items remain approved
 */
@Entity('requisition_item_approvals')
@Index(['requisitionId', 'itemNumber', 'materialId', 'approvalLevel'], { unique: true })
export class RequisitionItemApproval {
  @PrimaryGeneratedColumn({ name: 'item_approval_id' })
  itemApprovalId: number;

  @Column({ name: 'requisition_id' })
  requisitionId: number;

  // Store item content for matching even when items are recreated
  @Column({ name: 'item_number', type: 'integer' })
  itemNumber: number;

  @Column({ name: 'material_id' })
  materialId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  observation: string;

  // Reference to current item (may change if item is recreated)
  @Column({ name: 'requisition_item_id', nullable: true })
  requisitionItemId: number;

  @Column({ name: 'user_id' })
  userId: number;

  // 'reviewer' or 'management'
  @Column({ name: 'approval_level', type: 'varchar', length: 20 })
  approvalLevel: 'reviewer' | 'management';

  // 'approved' or 'rejected'
  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: 'approved' | 'rejected';

  @Column({ type: 'text', nullable: true })
  comments: string;

  // Track if this approval is still valid (becomes false if item is modified)
  @Column({ name: 'is_valid', type: 'boolean', default: true })
  isValid: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  // Relaciones
  @ManyToOne(() => Requisition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisition_id' })
  requisition: Requisition;

  @ManyToOne(() => RequisitionItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requisition_item_id' })
  requisitionItem: RequisitionItem;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;
}
