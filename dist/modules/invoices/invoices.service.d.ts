import { Repository } from 'typeorm';
import { Invoice } from '../../database/entities/invoice.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { SendToAccountingDto } from './dto/send-to-accounting.dto';
export declare class InvoicesService {
    private invoiceRepository;
    private purchaseOrderRepository;
    constructor(invoiceRepository: Repository<Invoice>, purchaseOrderRepository: Repository<PurchaseOrder>);
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
            creator: import("../../database/entities").User;
            currentApprover: import("../../database/entities").User;
            approvalStatus: import("../../database/entities").PurchaseOrderStatus;
            approvals: import("../../database/entities").PurchaseOrderApproval[];
            invoices: Invoice[];
        };
        invoices: Invoice[];
        summary: {
            totalInvoices: number;
            totalInvoicedAmount: number;
            totalInvoicedQuantity: number;
            pendingAmount: number;
            invoiceStatus: string;
        };
    }>;
    getPurchaseOrdersForInvoicing(page?: number, limit?: number): Promise<{
        data: PurchaseOrder[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    create(userId: number, createInvoiceDto: CreateInvoiceDto): Promise<Invoice | null>;
    update(invoiceId: number, updateInvoiceDto: UpdateInvoiceDto): Promise<Invoice | null>;
    remove(invoiceId: number): Promise<{
        message: string;
    }>;
    sendToAccounting(purchaseOrderId: number, sendToAccountingDto: SendToAccountingDto): Promise<{
        message: string;
        sentDate: string;
        invoicesCount: number;
    }>;
    private updatePurchaseOrderInvoiceTotals;
}
