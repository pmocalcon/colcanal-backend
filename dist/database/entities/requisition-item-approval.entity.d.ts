import { Requisition } from './requisition.entity';
import { RequisitionItem } from './requisition-item.entity';
import { User } from './user.entity';
export declare class RequisitionItemApproval {
    itemApprovalId: number;
    requisitionId: number;
    itemNumber: number;
    materialId: number;
    quantity: number;
    observation: string;
    requisitionItemId: number;
    userId: number;
    approvalLevel: 'reviewer' | 'management';
    status: 'approved' | 'rejected';
    comments: string;
    isValid: boolean;
    createdAt: Date;
    requisition: Requisition;
    requisitionItem: RequisitionItem;
    user: User;
}
