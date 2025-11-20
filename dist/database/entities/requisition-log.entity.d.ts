import { Requisition } from './requisition.entity';
import { User } from './user.entity';
export declare class RequisitionLog {
    logId: number;
    requisitionId: number;
    userId: number;
    action: string;
    previousStatus: string;
    newStatus: string;
    comments: string;
    createdAt: Date;
    requisition: Requisition;
    user: User;
}
