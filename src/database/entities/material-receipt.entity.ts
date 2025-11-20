import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { User } from './user.entity';

@Entity('material_receipts')
export class MaterialReceipt {
  @PrimaryGeneratedColumn({ name: 'receipt_id' })
  receiptId: number;

  @Column({ name: 'po_item_id', type: 'int' })
  poItemId: number;

  @Column({ name: 'quantity_received', type: 'decimal', precision: 10, scale: 2 })
  quantityReceived: number;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate: Date;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ name: 'overdelivery_justification', type: 'text', nullable: true })
  overdeliveryJustification: string;

  @Column({ name: 'created_by', type: 'int' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => PurchaseOrderItem, (poItem) => poItem.receipts)
  @JoinColumn({ name: 'po_item_id' })
  purchaseOrderItem: PurchaseOrderItem;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
