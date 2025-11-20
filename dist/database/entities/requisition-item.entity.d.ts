import { Requisition } from './requisition.entity';
import { Material } from './material.entity';
import { RequisitionItemQuotation } from './requisition-item-quotation.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
export declare class RequisitionItem {
    itemId: number;
    requisitionId: number;
    itemNumber: number;
    materialId: number;
    quantity: number;
    observation: string;
    requisition: Requisition;
    material: Material;
    quotations: RequisitionItemQuotation[];
    purchaseOrderItems: PurchaseOrderItem[];
}
