import { PurchaseOrder } from './purchase-order.entity';
import { User } from './user.entity';
export declare enum ApprovalStatus {
    PENDING = "pendiente",
    APPROVED = "aprobado",
    REJECTED = "rechazado"
}
export declare class PurchaseOrderApproval {
    approvalId: number;
    purchaseOrderId: number;
    approverId: number;
    approvalStatus: ApprovalStatus;
    comments: string | null;
    rejectionReason: string | null;
    approvalDate: Date | null;
    deadline: Date;
    isOverdue: boolean;
    createdAt: Date;
    purchaseOrder: PurchaseOrder;
    approver: User;
}
