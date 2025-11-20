import { Requisition } from './requisition.entity';
import { Supplier } from './supplier.entity';
import { User } from './user.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { PurchaseOrderApproval } from './purchase-order-approval.entity';
import { PurchaseOrderStatus } from './purchase-order-status.entity';
import { Invoice } from './invoice.entity';
export declare enum PurchaseOrderStatusCode {
    DRAFT = "borrador",
    PENDING_APPROVAL = "pendiente_aprobacion_gerencia",
    APPROVED = "aprobada_gerencia",
    REJECTED = "rechazada_gerencia",
    IN_RECEPTION = "en_recepcion",
    COMPLETED = "completada"
}
export declare class PurchaseOrder {
    purchaseOrderId: number;
    purchaseOrderNumber: string;
    requisitionId: number;
    supplierId: number;
    issueDate: Date;
    subtotal: number;
    totalIva: number;
    totalDiscount: number;
    totalAmount: number;
    approvalStatusId: number;
    rejectionCount: number;
    lastRejectionReason: string | null;
    currentApproverId: number;
    createdBy: number;
    totalInvoicedAmount: number;
    totalInvoicedQuantity: number;
    invoiceStatus: string;
    createdAt: Date;
    updatedAt: Date;
    requisition: Requisition;
    supplier: Supplier;
    creator: User;
    currentApprover: User;
    approvalStatus: PurchaseOrderStatus;
    items: PurchaseOrderItem[];
    approvals: PurchaseOrderApproval[];
    invoices: Invoice[];
}
