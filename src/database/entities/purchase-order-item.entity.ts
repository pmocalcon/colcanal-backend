import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { RequisitionItem } from './requisition-item.entity';
import { RequisitionItemQuotation } from './requisition-item-quotation.entity';
import { MaterialReceipt } from './material-receipt.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn({ name: 'po_item_id' })
  poItemId: number;

  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: number;

  @Column({ name: 'requisition_item_id' })
  requisitionItemId: number;

  @Column({ name: 'quotation_id' })
  quotationId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ name: 'has_iva', type: 'boolean', default: true })
  hasIva: boolean;

  @Column({ name: 'iva_percentage', type: 'decimal', precision: 5, scale: 2, default: 19 })
  ivaPercentage: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal: number;

  @Column({ name: 'iva_amount', type: 'decimal', precision: 15, scale: 2 })
  ivaAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  // Relations
  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => RequisitionItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisition_item_id' })
  requisitionItem: RequisitionItem;

  @ManyToOne(() => RequisitionItemQuotation)
  @JoinColumn({ name: 'quotation_id' })
  quotation: RequisitionItemQuotation;

  @OneToMany(() => MaterialReceipt, (receipt) => receipt.purchaseOrderItem)
  receipts: MaterialReceipt[];
}
