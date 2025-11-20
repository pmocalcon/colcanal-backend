import { Material } from './material.entity';
import { Supplier } from './supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { User } from './user.entity';
export declare class MaterialPriceHistory {
    priceHistoryId: number;
    materialId: number;
    supplierId: number;
    unitPrice: number;
    hasIva: boolean;
    ivaPercentage: number;
    discount: number;
    purchaseOrderItemId: number;
    purchaseOrderId: number;
    createdBy: number;
    createdAt: Date;
    material: Material;
    supplier: Supplier;
    purchaseOrderItem: PurchaseOrderItem;
    purchaseOrder: PurchaseOrder;
    creator: User;
}
