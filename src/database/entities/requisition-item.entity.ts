import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Requisition } from './requisition.entity';
import { Material } from './material.entity';
import { RequisitionItemQuotation } from './requisition-item-quotation.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { RequisitionItemApproval } from './requisition-item-approval.entity';

@Entity('requisition_items')
export class RequisitionItem {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  itemId: number;

  @Column({ name: 'requisition_id' })
  requisitionId: number;

  @Column({ name: 'item_number', type: 'integer' })
  itemNumber: number;

  @Column({ name: 'material_id' })
  materialId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  observation: string;

  // Relaciones
  @ManyToOne(() => Requisition, (requisition) => requisition.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requisition_id' })
  requisition: Requisition;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @OneToMany(() => RequisitionItemQuotation, (quotation) => quotation.requisitionItem)
  quotations: RequisitionItemQuotation[];

  @OneToMany(() => PurchaseOrderItem, (poItem) => poItem.requisitionItem)
  purchaseOrderItems: PurchaseOrderItem[];

  @OneToMany(() => RequisitionItemApproval, (approval) => approval.requisitionItem)
  itemApprovals: RequisitionItemApproval[];
}
