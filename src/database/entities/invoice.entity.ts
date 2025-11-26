import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { User } from './user.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn({ name: 'invoice_id' })
  invoiceId: number;

  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: number;

  @Column({ name: 'invoice_number', length: 100, unique: true })
  invoiceNumber: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'material_quantity', type: 'decimal', precision: 10, scale: 2 })
  materialQuantity: number;

  @Column({ name: 'sent_to_accounting', default: false })
  sentToAccounting: boolean;

  @Column({ name: 'sent_to_accounting_date', type: 'date', nullable: true })
  sentToAccountingDate: Date | null;

  // Campos para recepción por contabilidad
  @Column({ name: 'received_by_accounting', default: false })
  receivedByAccounting: boolean;

  @Column({ name: 'received_by_accounting_date', type: 'date', nullable: true })
  receivedByAccountingDate: Date | null;

  @Column({ name: 'received_by_accounting_user_id', nullable: true })
  receivedByAccountingUserId: number | null;

  @Column({ name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => PurchaseOrder, (po) => po.invoices)
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'received_by_accounting_user_id' })
  receivedByAccountingUser: User;
}
