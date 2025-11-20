import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { SendToAccountingDto } from './dto/send-to-accounting.dto';
import { User } from '../../database/entities/user.entity';
export declare class InvoicesController {
    private readonly invoicesService;
    constructor(invoicesService: InvoicesService);
    getPurchaseOrdersForInvoicing(page?: number, limit?: number): Promise<{
        data: import("../../database/entities").PurchaseOrder[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getInvoicesByPurchaseOrder(purchaseOrderId: number): Promise<{
        purchaseOrder: {
            items: {
                purchaseOrderItemId: number;
                materialId: number;
                quantity: number;
                unitPrice: number;
                subtotal: number;
                iva: number;
                total: number;
                material: {
                    materialId: number;
                    codigo: string;
                    descripcion: string;
                    unidadMedida: string;
                } | null;
            }[];
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
            requisition: import("../../database/entities").Requisition;
            supplier: import("../../database/entities").Supplier;
            creator: User;
            currentApprover: User;
            approvalStatus: import("../../database/entities").PurchaseOrderStatus;
            approvals: import("../../database/entities").PurchaseOrderApproval[];
            invoices: import("../../database/entities").Invoice[];
        };
        invoices: import("../../database/entities").Invoice[];
        summary: {
            totalInvoices: number;
            totalInvoicedAmount: number;
            totalInvoicedQuantity: number;
            pendingAmount: number;
            invoiceStatus: string;
        };
    }>;
    create(user: User, createInvoiceDto: CreateInvoiceDto): Promise<import("../../database/entities").Invoice | null>;
    update(id: number, updateInvoiceDto: UpdateInvoiceDto): Promise<import("../../database/entities").Invoice | null>;
    remove(id: number): Promise<{
        message: string;
    }>;
    sendToAccounting(purchaseOrderId: number, sendToAccountingDto: SendToAccountingDto): Promise<{
        message: string;
        sentDate: string;
        invoicesCount: number;
    }>;
}
