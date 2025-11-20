import { PurchaseOrderItem } from './purchase-order-item.entity';
import { User } from './user.entity';
export declare class MaterialReceipt {
    receiptId: number;
    poItemId: number;
    quantityReceived: number;
    receivedDate: Date;
    observations: string;
    overdeliveryJustification: string;
    createdBy: number;
    createdAt: Date;
    updatedAt: Date;
    purchaseOrderItem: PurchaseOrderItem;
    creator: User;
}
