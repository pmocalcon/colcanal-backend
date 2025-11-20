import { RequisitionItem } from './requisition-item.entity';
import { Supplier } from './supplier.entity';
import { User } from './user.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
export declare class RequisitionItemQuotation {
    quotationId: number;
    requisitionItemId: number;
    action: string;
    supplierId: number | null;
    supplierOrder: number;
    justification: string;
    observations: string;
    version: number;
    isActive: boolean;
    unitPrice: number | null;
    hasIva: boolean;
    discount: number;
    isSelected: boolean;
    createdBy: number;
    createdAt: Date;
    requisitionItem: RequisitionItem;
    supplier: Supplier;
    creator: User;
    purchaseOrderItems: PurchaseOrderItem[];
}
