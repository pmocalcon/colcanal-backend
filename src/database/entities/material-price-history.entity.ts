import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Material } from './material.entity';
import { Supplier } from './supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { User } from './user.entity';

/**
 * Historial de precios de materiales.
 * Se registra un precio cada vez que se crea una orden de compra.
 * Permite pre-poblar precios en futuras órdenes basado en el último precio por material+proveedor.
 */
@Entity('material_price_history')
export class MaterialPriceHistory {
  @PrimaryGeneratedColumn({ name: 'price_history_id' })
  priceHistoryId: number;

  @Column({ name: 'material_id' })
  materialId: number;

  @Column({ name: 'supplier_id' })
  supplierId: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ name: 'has_iva', type: 'boolean', default: true })
  hasIva: boolean;

  @Column({ name: 'iva_percentage', type: 'decimal', precision: 5, scale: 2, default: 19 })
  ivaPercentage: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discount: number;

  @Column({ name: 'purchase_order_item_id' })
  purchaseOrderItemId: number;

  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: number;

  @Column({ name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => PurchaseOrderItem)
  @JoinColumn({ name: 'purchase_order_item_id' })
  purchaseOrderItem: PurchaseOrderItem;

  @ManyToOne(() => PurchaseOrder)
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
