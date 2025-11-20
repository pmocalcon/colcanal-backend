import { Company } from './company.entity';
import { Project } from './project.entity';
import { Requisition } from './requisition.entity';
import { PurchaseOrderSequence } from './purchase-order-sequence.entity';
export declare class OperationCenter {
    centerId: number;
    companyId: number;
    projectId: number;
    code: string;
    company: Company;
    project: Project;
    requisitions: Requisition[];
    purchaseOrderSequences: PurchaseOrderSequence[];
}
