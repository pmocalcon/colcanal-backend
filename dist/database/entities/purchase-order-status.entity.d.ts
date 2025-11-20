import { PurchaseOrder } from './purchase-order.entity';
export declare class PurchaseOrderStatus {
    statusId: number;
    code: string;
    name: string;
    description: string;
    color: string;
    order: number;
    purchaseOrders: PurchaseOrder[];
}
