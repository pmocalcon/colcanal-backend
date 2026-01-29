import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Requisition } from './requisition.entity';
import { Supplier } from './supplier.entity';
import { User } from './user.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { PurchaseOrderApproval } from './purchase-order-approval.entity';
import { PurchaseOrderStatus } from './purchase-order-status.entity';
import { Invoice } from './invoice.entity';

// Legacy enum - kept for backward compatibility during code migration
// Use PurchaseOrderStatus entity relation instead
export enum PurchaseOrderStatusCode {
  DRAFT = 'borrador',
  PENDING_APPROVAL = 'pendiente_aprobacion_gerencia',
  APPROVED = 'aprobada_gerencia',
  REJECTED = 'rechazada_gerencia',
  IN_RECEPTION = 'en_recepcion',
  COMPLETED = 'completada',
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn({ name: 'purchase_order_id' })
  purchaseOrderId: number;

  @Column({ name: 'purchase_order_number', type: 'varchar', length: 50, unique: true })
  purchaseOrderNumber: string;

  @Column({ name: 'requisition_id' })
  requisitionId: number;

  @Column({ name: 'supplier_id' })
  supplierId: number;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @Column({ name: 'estimated_delivery_date', type: 'date', nullable: true })
  estimatedDeliveryDate: Date | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal: number;

  @Column({ name: 'total_iva', type: 'decimal', precision: 15, scale: 2 })
  totalIva: number;

  @Column({ name: 'total_discount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDiscount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ name: 'other_value', type: 'decimal', precision: 15, scale: 2, default: 0 })
  otherValue: number;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  // Approval status FK (replaces enum)
  @Column({ name: 'approval_status_id' })
  approvalStatusId: number;

  @Column({ name: 'rejection_count', type: 'int', default: 0 })
  rejectionCount: number;

  @Column({ name: 'last_rejection_reason', type: 'text', nullable: true })
  lastRejectionReason: string | null;

  @Column({ name: 'current_approver_id', type: 'int', nullable: true })
  currentApproverId: number;

  @Column({ name: 'created_by' })
  createdBy: number;

  // Invoice-related fields
  @Column({ name: 'total_invoiced_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalInvoicedAmount: number;

  @Column({ name: 'total_invoiced_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalInvoicedQuantity: number;

  @Column({ name: 'invoice_status', type: 'varchar', length: 50, default: 'sin_factura' })
  invoiceStatus: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Requisition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisition_id' })
  requisition: Requisition;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'current_approver_id' })
  currentApprover: User;

  @ManyToOne(() => PurchaseOrderStatus, (status) => status.purchaseOrders)
  @JoinColumn({ name: 'approval_status_id' })
  approvalStatus: PurchaseOrderStatus;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder)
  items: PurchaseOrderItem[];

  @OneToMany(() => PurchaseOrderApproval, (approval) => approval.purchaseOrder)
  approvals: PurchaseOrderApproval[];

  @OneToMany(() => Invoice, (invoice) => invoice.purchaseOrder)
  invoices: Invoice[];
}
