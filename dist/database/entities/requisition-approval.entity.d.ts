import { Requisition } from './requisition.entity';
import { User } from './user.entity';
import { RequisitionStatus } from './requisition-status.entity';
export declare class RequisitionApproval {
    approvalId: number;
    requisitionId: number;
    userId: number;
    action: string;
    stepOrder: number;
    previousStatusId: number;
    newStatusId: number;
    comments: string;
    createdAt: Date;
    requisition: Requisition;
    user: User;
    previousStatus: RequisitionStatus;
    newStatus: RequisitionStatus;
}
