import { Requisition } from './requisition.entity';
import { RequisitionApproval } from './requisition-approval.entity';
export declare class RequisitionStatus {
    statusId: number;
    code: string;
    name: string;
    description: string;
    color: string;
    order: number;
    requisitions: Requisition[];
    approvalsAsPreviousStatus: RequisitionApproval[];
    approvalsAsNewStatus: RequisitionApproval[];
}
