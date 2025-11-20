import { PurchaseOrderApproval } from './purchase-order-approval.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
export declare enum ItemApprovalStatus {
    PENDING = "pendiente",
    APPROVED = "aprobado",
    REJECTED = "rechazado"
}
export declare class PurchaseOrderItemApproval {
    itemApprovalId: number;
    poApprovalId: number;
    poItemId: number;
    approvalStatus: ItemApprovalStatus;
    comments: string | null;
    createdAt: Date;
    purchaseOrderApproval: PurchaseOrderApproval;
    purchaseOrderItem: PurchaseOrderItem;
}
