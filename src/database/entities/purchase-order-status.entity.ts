import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('purchase_order_statuses')
export class PurchaseOrderStatus {
  @PrimaryGeneratedColumn({ name: 'status_id' })
  statusId: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @OneToMany(() => PurchaseOrder, (purchaseOrder) => purchaseOrder.approvalStatus)
  purchaseOrders: PurchaseOrder[];
}
