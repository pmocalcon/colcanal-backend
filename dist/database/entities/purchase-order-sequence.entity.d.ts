import { OperationCenter } from './operation-center.entity';
export declare class PurchaseOrderSequence {
    sequenceId: number;
    operationCenterId: number;
    lastNumber: number;
    createdAt: Date;
    updatedAt: Date;
    operationCenter: OperationCenter;
}
