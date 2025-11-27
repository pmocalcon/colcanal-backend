import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { RequisitionItem } from './requisition-item.entity';
import { Supplier } from './supplier.entity';
import { User } from './user.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

@Entity('requisition_item_quotations')
export class RequisitionItemQuotation {
  @PrimaryGeneratedColumn({ name: 'quotation_id' })
  quotationId: number;

  @Column({ name: 'requisition_item_id' })
  requisitionItemId: number;

  @Column({
    type: 'varchar',
    length: 20,
    comment: 'cotizar | no_requiere',
  })
  action: string;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: number | null;

  @Column({
    name: 'supplier_order',
    type: 'smallint',
    default: 1,
    comment: '1 for first supplier, 2 for second supplier',
  })
  supplierOrder: number;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    comment: 'Precio unitario sin IVA ingresado por Compras',
  })
  unitPrice: number | null;

  @Column({
    name: 'has_iva',
    type: 'boolean',
    default: false,
    comment: 'Indica si el ítem tiene IVA del 19%',
  })
  hasIva: boolean;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    comment: 'Descuento aplicado al ítem',
  })
  discount: number;

  @Column({
    name: 'is_selected',
    type: 'boolean',
    default: false,
    comment: 'Marca el proveedor seleccionado cuando hay múltiples opciones',
  })
  isSelected: boolean;

  @Column({ name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  // Relaciones
  @ManyToOne(() => RequisitionItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisition_item_id' })
  requisitionItem: RequisitionItem;

  @ManyToOne(() => Supplier, (supplier) => supplier.quotations, {
    nullable: true,
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => PurchaseOrderItem, (poItem) => poItem.quotation)
  purchaseOrderItems: PurchaseOrderItem[];
}
