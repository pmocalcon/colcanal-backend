import { PurchaseOrder } from './purchase-order.entity';
import { RequisitionItem } from './requisition-item.entity';
import { RequisitionItemQuotation } from './requisition-item-quotation.entity';
import { MaterialReceipt } from './material-receipt.entity';
export declare class PurchaseOrderItem {
    poItemId: number;
    purchaseOrderId: number;
    requisitionItemId: number;
    quotationId: number;
    quantity: number;
    unitPrice: number;
    hasIva: boolean;
    ivaPercentage: number;
    subtotal: number;
    ivaAmount: number;
    discount: number;
    totalAmount: number;
    purchaseOrder: PurchaseOrder;
    requisitionItem: RequisitionItem;
    quotation: RequisitionItemQuotation;
    receipts: MaterialReceipt[];
}
