import { PurchaseOrder } from './purchase-order.entity';
import { User } from './user.entity';
export declare class Invoice {
    invoiceId: number;
    purchaseOrderId: number;
    invoiceNumber: string;
    issueDate: Date;
    amount: number;
    materialQuantity: number;
    sentToAccounting: boolean;
    sentToAccountingDate: Date | null;
    createdBy: number;
    createdAt: Date;
    updatedAt: Date;
    purchaseOrder: PurchaseOrder;
    creator: User;
}
