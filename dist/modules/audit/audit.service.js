"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const requisition_log_entity_1 = require("../../database/entities/requisition-log.entity");
let AuditService = class AuditService {
    requisitionLogRepository;
    constructor(requisitionLogRepository) {
        this.requisitionLogRepository = requisitionLogRepository;
    }
    async getAuditLogs(page = 1, limit = 50, filters) {
        const skip = (page - 1) * limit;
        const queryBuilder = this.requisitionLogRepository
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user')
            .leftJoinAndSelect('log.requisition', 'requisition')
            .leftJoinAndSelect('requisition.operationCenter', 'operationCenter')
            .leftJoinAndSelect('operationCenter.company', 'company');
        if (filters?.userId) {
            queryBuilder.andWhere('log.userId = :userId', { userId: filters.userId });
        }
        if (filters?.action) {
            queryBuilder.andWhere('log.action = :action', { action: filters.action });
        }
        if (filters?.requisitionId) {
            queryBuilder.andWhere('log.requisitionId = :requisitionId', {
                requisitionId: filters.requisitionId,
            });
        }
        if (filters?.fromDate && filters?.toDate) {
            queryBuilder.andWhere('log.createdAt BETWEEN :fromDate AND :toDate', {
                fromDate: new Date(filters.fromDate),
                toDate: new Date(filters.toDate),
            });
        }
        else if (filters?.fromDate) {
            queryBuilder.andWhere('log.createdAt >= :fromDate', {
                fromDate: new Date(filters.fromDate),
            });
        }
        else if (filters?.toDate) {
            queryBuilder.andWhere('log.createdAt <= :toDate', {
                toDate: new Date(filters.toDate),
            });
        }
        queryBuilder.orderBy('log.createdAt', 'DESC');
        queryBuilder.skip(skip).take(limit);
        const [logs, total] = await queryBuilder.getManyAndCount();
        return {
            data: logs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getRequisitionDetail(requisitionId) {
        const logs = await this.requisitionLogRepository
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user')
            .leftJoinAndSelect('log.requisition', 'requisition')
            .leftJoinAndSelect('requisition.company', 'company')
            .leftJoinAndSelect('requisition.project', 'project')
            .leftJoinAndSelect('requisition.operationCenter', 'operationCenter')
            .leftJoinAndSelect('requisition.projectCode', 'projectCode')
            .leftJoinAndSelect('requisition.creator', 'creator')
            .leftJoinAndSelect('requisition.status', 'status')
            .leftJoinAndSelect('requisition.reviewer', 'reviewer')
            .leftJoinAndSelect('requisition.approver', 'approver')
            .leftJoinAndSelect('requisition.items', 'items')
            .leftJoinAndSelect('items.material', 'material')
            .leftJoinAndSelect('items.quotations', 'quotations')
            .leftJoinAndSelect('quotations.supplier', 'supplier')
            .leftJoinAndSelect('requisition.purchaseOrders', 'purchaseOrders')
            .leftJoinAndSelect('purchaseOrders.items', 'purchaseOrderItems')
            .leftJoinAndSelect('purchaseOrders.supplier', 'poSupplier')
            .leftJoinAndSelect('requisition.approvals', 'approvals')
            .leftJoinAndSelect('approvals.user', 'approvalUser')
            .where('log.requisitionId = :requisitionId', { requisitionId })
            .orderBy('log.createdAt', 'ASC')
            .getMany();
        if (!logs || logs.length === 0) {
            return null;
        }
        const requisition = logs[0].requisition;
        let subtotal = 0;
        let iva = 0;
        let total = 0;
        if (requisition.items && requisition.items.length > 0) {
            requisition.items.forEach((item) => {
                if (item.quotations && item.quotations.length > 0) {
                    const selectedQuotation = item.quotations.find((q) => q.isSelected) || item.quotations[0];
                    if (selectedQuotation && selectedQuotation.unitPrice) {
                        const itemSubtotal = selectedQuotation.unitPrice * item.quantity;
                        subtotal += itemSubtotal;
                    }
                }
            });
            iva = subtotal * 0.16;
            total = subtotal + iva;
        }
        const timeline = logs.map((log, index) => {
            let timeSincePrevious = null;
            if (index > 0) {
                const prevLog = logs[index - 1];
                const diffMs = new Date(log.createdAt).getTime() - new Date(prevLog.createdAt).getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);
                if (diffDays > 0) {
                    timeSincePrevious = `${diffDays} día${diffDays > 1 ? 's' : ''}`;
                }
                else if (diffHours > 0) {
                    timeSincePrevious = `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                }
                else {
                    const diffMinutes = Math.floor(diffMs / (1000 * 60));
                    if (diffMinutes > 0) {
                        timeSincePrevious = `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
                    }
                    else {
                        timeSincePrevious = 'unos segundos';
                    }
                }
            }
            return {
                logId: log.logId,
                action: log.action,
                createdAt: log.createdAt,
                user: {
                    userId: log.user.userId,
                    nombre: log.user.nombre,
                    email: log.user.email,
                    cargo: log.user.cargo,
                },
                previousStatus: log.previousStatus,
                newStatus: log.newStatus,
                comments: log.comments,
                timeSincePrevious,
            };
        });
        return {
            requisition: {
                requisitionId: requisition.requisitionId,
                requisitionNumber: requisition.requisitionNumber,
                company: requisition.company,
                project: requisition.project,
                operationCenter: requisition.operationCenter,
                projectCode: requisition.projectCode,
                creator: requisition.creator,
                status: requisition.status,
                reviewer: requisition.reviewer,
                approver: requisition.approver,
                createdAt: requisition.createdAt,
                updatedAt: requisition.updatedAt,
                reviewedAt: requisition.reviewedAt,
                approvedAt: requisition.approvedAt,
                obra: requisition.obra,
                codigoObra: requisition.codigoObra,
                items: requisition.items,
                purchaseOrders: requisition.purchaseOrders,
                approvals: requisition.approvals,
            },
            amounts: {
                subtotal,
                iva,
                total,
            },
            timeline,
        };
    }
    async getAuditStats() {
        const totalLogs = await this.requisitionLogRepository.count();
        const logsByAction = await this.requisitionLogRepository
            .createQueryBuilder('log')
            .select('log.action', 'action')
            .addSelect('COUNT(*)', 'count')
            .groupBy('log.action')
            .getRawMany();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentLogs = await this.requisitionLogRepository
            .createQueryBuilder('log')
            .where('log.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
            .getCount();
        return {
            totalLogs,
            logsByAction,
            recentLogs,
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(requisition_log_entity_1.RequisitionLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditService);
//# sourceMappingURL=audit.service.js.map