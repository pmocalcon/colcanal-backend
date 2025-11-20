import { RequisitionItemQuotation } from './requisition-item-quotation.entity';
import { PurchaseOrder } from './purchase-order.entity';
export declare class Supplier {
    supplierId: number;
    name: string;
    nitCc: string;
    phone: string;
    address: string;
    city: string;
    email: string;
    contactPerson: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    quotations: RequisitionItemQuotation[];
    purchaseOrders: PurchaseOrder[];
}
