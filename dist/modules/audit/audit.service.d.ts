import { Repository } from 'typeorm';
import { RequisitionLog } from '../../database/entities/requisition-log.entity';
export declare class AuditService {
    private requisitionLogRepository;
    constructor(requisitionLogRepository: Repository<RequisitionLog>);
    getAuditLogs(page?: number, limit?: number, filters?: {
        userId?: number;
        action?: string;
        requisitionId?: number;
        fromDate?: string;
        toDate?: string;
    }): Promise<{
        data: RequisitionLog[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getRequisitionDetail(requisitionId: number): Promise<{
        requisition: {
            requisitionId: number;
            requisitionNumber: string;
            company: import("../../database/entities").Company;
            project: import("../../database/entities").Project;
            operationCenter: import("../../database/entities").OperationCenter;
            projectCode: import("../../database/entities").ProjectCode;
            creator: import("../../database/entities").User;
            status: import("../../database/entities").RequisitionStatus;
            reviewer: import("../../database/entities").User;
            approver: import("../../database/entities").User;
            createdAt: Date;
            updatedAt: Date;
            reviewedAt: Date;
            approvedAt: Date;
            obra: string;
            codigoObra: string;
            items: import("../../database/entities").RequisitionItem[];
            purchaseOrders: import("../../database/entities").PurchaseOrder[];
            approvals: import("../../database/entities").RequisitionApproval[];
        };
        amounts: {
            subtotal: number;
            iva: number;
            total: number;
        };
        timeline: {
            logId: number;
            action: string;
            createdAt: Date;
            user: {
                userId: number;
                nombre: string;
                email: string;
                cargo: string;
            };
            previousStatus: string;
            newStatus: string;
            comments: string;
            timeSincePrevious: string | null;
        }[];
    } | null>;
    getAuditStats(): Promise<{
        totalLogs: number;
        logsByAction: any[];
        recentLogs: number;
    }>;
}
