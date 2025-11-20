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
exports.PurchasesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const requisition_entity_1 = require("../../database/entities/requisition.entity");
const requisition_item_entity_1 = require("../../database/entities/requisition-item.entity");
const requisition_log_entity_1 = require("../../database/entities/requisition-log.entity");
const requisition_status_entity_1 = require("../../database/entities/requisition-status.entity");
const requisition_prefix_entity_1 = require("../../database/entities/requisition-prefix.entity");
const requisition_sequence_entity_1 = require("../../database/entities/requisition-sequence.entity");
const requisition_item_approval_entity_1 = require("../../database/entities/requisition-item-approval.entity");
const operation_center_entity_1 = require("../../database/entities/operation-center.entity");
const project_code_entity_1 = require("../../database/entities/project-code.entity");
const user_entity_1 = require("../../database/entities/user.entity");
const authorization_entity_1 = require("../../database/entities/authorization.entity");
const company_entity_1 = require("../../database/entities/company.entity");
const supplier_entity_1 = require("../../database/entities/supplier.entity");
const requisition_item_quotation_entity_1 = require("../../database/entities/requisition-item-quotation.entity");
const purchase_order_entity_1 = require("../../database/entities/purchase-order.entity");
const purchase_order_item_entity_1 = require("../../database/entities/purchase-order-item.entity");
const purchase_order_sequence_entity_1 = require("../../database/entities/purchase-order-sequence.entity");
const purchase_order_status_entity_1 = require("../../database/entities/purchase-order-status.entity");
const material_receipt_entity_1 = require("../../database/entities/material-receipt.entity");
const material_price_history_entity_1 = require("../../database/entities/material-price-history.entity");
const purchase_order_approval_entity_1 = require("../../database/entities/purchase-order-approval.entity");
const purchase_order_item_approval_entity_1 = require("../../database/entities/purchase-order-item-approval.entity");
const business_days_util_1 = require("../../utils/business-days.util");
let PurchasesService = class PurchasesService {
    requisitionRepository;
    requisitionItemRepository;
    requisitionLogRepository;
    requisitionStatusRepository;
    requisitionPrefixRepository;
    requisitionSequenceRepository;
    operationCenterRepository;
    projectCodeRepository;
    userRepository;
    authorizationRepository;
    companyRepository;
    supplierRepository;
    quotationRepository;
    purchaseOrderRepository;
    purchaseOrderItemRepository;
    purchaseOrderSequenceRepository;
    materialReceiptRepository;
    itemApprovalRepository;
    materialPriceHistoryRepository;
    purchaseOrderApprovalRepository;
    purchaseOrderItemApprovalRepository;
    purchaseOrderStatusRepository;
    dataSource;
    constructor(requisitionRepository, requisitionItemRepository, requisitionLogRepository, requisitionStatusRepository, requisitionPrefixRepository, requisitionSequenceRepository, operationCenterRepository, projectCodeRepository, userRepository, authorizationRepository, companyRepository, supplierRepository, quotationRepository, purchaseOrderRepository, purchaseOrderItemRepository, purchaseOrderSequenceRepository, materialReceiptRepository, itemApprovalRepository, materialPriceHistoryRepository, purchaseOrderApprovalRepository, purchaseOrderItemApprovalRepository, purchaseOrderStatusRepository, dataSource) {
        this.requisitionRepository = requisitionRepository;
        this.requisitionItemRepository = requisitionItemRepository;
        this.requisitionLogRepository = requisitionLogRepository;
        this.requisitionStatusRepository = requisitionStatusRepository;
        this.requisitionPrefixRepository = requisitionPrefixRepository;
        this.requisitionSequenceRepository = requisitionSequenceRepository;
        this.operationCenterRepository = operationCenterRepository;
        this.projectCodeRepository = projectCodeRepository;
        this.userRepository = userRepository;
        this.authorizationRepository = authorizationRepository;
        this.companyRepository = companyRepository;
        this.supplierRepository = supplierRepository;
        this.quotationRepository = quotationRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.purchaseOrderSequenceRepository = purchaseOrderSequenceRepository;
        this.materialReceiptRepository = materialReceiptRepository;
        this.itemApprovalRepository = itemApprovalRepository;
        this.materialPriceHistoryRepository = materialPriceHistoryRepository;
        this.purchaseOrderApprovalRepository = purchaseOrderApprovalRepository;
        this.purchaseOrderItemApprovalRepository = purchaseOrderItemApprovalRepository;
        this.purchaseOrderStatusRepository = purchaseOrderStatusRepository;
        this.dataSource = dataSource;
    }
    async getStatusIdByCode(code) {
        const status = await this.requisitionStatusRepository.findOne({
            where: { code },
        });
        if (!status) {
            throw new Error(`Estado de requisición '${code}' no encontrado`);
        }
        return status.statusId;
    }
    async getPurchaseOrderStatusId(code) {
        const status = await this.purchaseOrderStatusRepository.findOne({
            where: { code },
            cache: {
                id: `po_status_${code}`,
                milliseconds: 86400000,
            },
        });
        if (!status) {
            throw new common_1.BadRequestException(`Estado de orden de compra '${code}' no encontrado`);
        }
        return status.statusId;
    }
    async saveItemApprovals(requisitionId, userId, approvalLevel, itemDecisions, queryRunner) {
        if (!itemDecisions || itemDecisions.length === 0) {
            return;
        }
        const items = await queryRunner.manager.find(requisition_item_entity_1.RequisitionItem, {
            where: { requisitionId },
            relations: ['material'],
        });
        for (const decision of itemDecisions) {
            const item = items.find(i => i.itemId === decision.itemId);
            if (!item) {
                continue;
            }
            const existing = await queryRunner.manager.findOne(requisition_item_approval_entity_1.RequisitionItemApproval, {
                where: {
                    requisitionId,
                    itemNumber: item.itemNumber,
                    materialId: item.materialId,
                    approvalLevel,
                },
            });
            if (existing) {
                await queryRunner.manager.update(requisition_item_approval_entity_1.RequisitionItemApproval, { itemApprovalId: existing.itemApprovalId }, {
                    requisitionItemId: item.itemId,
                    quantity: item.quantity,
                    observation: item.observation,
                    userId,
                    status: decision.decision === 'approve' ? 'approved' : 'rejected',
                    comments: decision.comments,
                    isValid: true,
                });
            }
            else {
                const approval = queryRunner.manager.create(requisition_item_approval_entity_1.RequisitionItemApproval, {
                    requisitionId,
                    itemNumber: item.itemNumber,
                    materialId: item.materialId,
                    quantity: item.quantity,
                    observation: item.observation,
                    requisitionItemId: item.itemId,
                    userId,
                    approvalLevel,
                    status: decision.decision === 'approve' ? 'approved' : 'rejected',
                    comments: decision.comments,
                    isValid: true,
                });
                await queryRunner.manager.save(requisition_item_approval_entity_1.RequisitionItemApproval, approval);
            }
        }
    }
    async getItemApprovals(requisitionId, approvalLevel) {
        const where = {
            requisitionId,
            isValid: true,
        };
        if (approvalLevel) {
            where.approvalLevel = approvalLevel;
        }
        const approvals = await this.itemApprovalRepository.find({
            where,
            relations: ['user', 'requisitionItem', 'requisitionItem.material'],
            order: { createdAt: 'DESC' },
        });
        return approvals;
    }
    async invalidateItemApprovals(requisitionId, modifiedItemIds, queryRunner) {
        if (modifiedItemIds.length === 0) {
            return;
        }
        await queryRunner.manager.update(requisition_item_approval_entity_1.RequisitionItemApproval, {
            requisitionId,
            requisitionItemId: (0, typeorm_2.In)(modifiedItemIds),
            isValid: true,
        }, { isValid: false });
    }
    async invalidateItemApprovalsByContent(requisitionId, itemsToInvalidate, queryRunner) {
        if (itemsToInvalidate.length === 0) {
            return;
        }
        for (const item of itemsToInvalidate) {
            await queryRunner.manager.update(requisition_item_approval_entity_1.RequisitionItemApproval, {
                requisitionId,
                itemNumber: item.itemNumber,
                materialId: item.materialId,
                isValid: true,
            }, { isValid: false });
        }
    }
    async createRequisition(userId, dto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const user = await this.userRepository.findOne({
                where: { userId },
                relations: ['role'],
            });
            if (!user) {
                throw new common_1.NotFoundException('Usuario no encontrado');
            }
            await this.validateUserCanCreate(user);
            const company = await this.companyRepository.findOne({
                where: { companyId: dto.companyId },
            });
            if (!company) {
                throw new common_1.NotFoundException('Empresa no encontrada');
            }
            if (company.name.includes('Canales & Contactos') && !dto.projectId) {
                throw new common_1.BadRequestException('El proyecto es requerido para Canales & Contactos');
            }
            const operationCenterId = await this.determineOperationCenter(dto.companyId, dto.projectId);
            const projectCodeId = await this.determineProjectCode(dto.companyId, dto.projectId);
            const requisitionNumber = await this.generateRequisitionNumber(dto.companyId, dto.projectId, queryRunner);
            const pendingStatusId = await this.getStatusIdByCode('pendiente');
            const requisition = queryRunner.manager.create(requisition_entity_1.Requisition, {
                requisitionNumber,
                companyId: dto.companyId,
                projectId: dto.projectId,
                operationCenterId,
                projectCodeId: projectCodeId || undefined,
                createdBy: userId,
                statusId: pendingStatusId,
            });
            const savedRequisition = await queryRunner.manager.save(requisition);
            const items = dto.items.map((item, index) => queryRunner.manager.create(requisition_item_entity_1.RequisitionItem, {
                requisitionId: savedRequisition.requisitionId,
                itemNumber: index + 1,
                materialId: item.materialId,
                quantity: item.quantity,
                observation: item.observation,
            }));
            await queryRunner.manager.save(requisition_item_entity_1.RequisitionItem, items);
            const log = queryRunner.manager.create(requisition_log_entity_1.RequisitionLog, {
                requisitionId: savedRequisition.requisitionId,
                userId,
                action: 'crear_requisicion',
                previousStatus: undefined,
                newStatus: 'pendiente',
                comments: `Requisición creada: ${requisitionNumber}`,
            });
            await queryRunner.manager.save(log);
            await queryRunner.commitTransaction();
            return this.getRequisitionById(savedRequisition.requisitionId, userId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            if (error.code === '23503') {
                const detail = error.detail || '';
                throw new common_1.BadRequestException(`Error de referencia en base de datos: ${detail}. Verifica que companyId, projectId, materialIds existan en la base de datos.`);
            }
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async getMyRequisitions(userId, filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const projectId = filters.projectId;
        const { status, fromDate, toDate } = filters;
        const queryBuilder = this.requisitionRepository
            .createQueryBuilder('requisition')
            .leftJoinAndSelect('requisition.company', 'company')
            .leftJoinAndSelect('requisition.project', 'project')
            .leftJoinAndSelect('requisition.operationCenter', 'operationCenter')
            .leftJoinAndSelect('requisition.projectCode', 'projectCode')
            .leftJoinAndSelect('requisition.creator', 'creator')
            .leftJoinAndSelect('creator.role', 'role')
            .leftJoinAndSelect('requisition.status', 'requisitionStatus')
            .leftJoinAndSelect('requisition.items', 'items')
            .leftJoinAndSelect('items.material', 'material')
            .leftJoinAndSelect('material.materialGroup', 'materialGroup')
            .leftJoinAndSelect('requisition.logs', 'logs')
            .leftJoinAndSelect('logs.user', 'logUser')
            .leftJoinAndSelect('logUser.role', 'logUserRole')
            .where('requisition.createdBy = :userId', { userId })
            .orderBy('requisition.createdAt', 'DESC')
            .addOrderBy('logs.createdAt', 'DESC');
        if (status) {
            queryBuilder.andWhere('requisitionStatus.code = :status', { status });
        }
        if (projectId) {
            queryBuilder.andWhere('requisition.projectId = :projectId', {
                projectId,
            });
        }
        if (fromDate && toDate) {
            queryBuilder.andWhere('requisition.createdAt BETWEEN :fromDate AND :toDate', {
                fromDate: new Date(fromDate),
                toDate: new Date(toDate),
            });
        }
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);
        const [requisitions, total] = await queryBuilder.getManyAndCount();
        return {
            data: requisitions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getRequisitionById(requisitionId, userId) {
        const requisition = await this.requisitionRepository.findOne({
            where: { requisitionId },
            relations: [
                'company',
                'project',
                'operationCenter',
                'projectCode',
                'creator',
                'creator.role',
                'status',
                'items',
                'items.material',
                'items.material.materialGroup',
                'logs',
                'logs.user',
            ],
        });
        if (!requisition) {
            throw new common_1.NotFoundException('Requisición no encontrada');
        }
        const canView = await this.canViewRequisition(requisition, userId);
        if (!canView) {
            throw new common_1.ForbiddenException('No tiene permiso para ver esta requisición');
        }
        return requisition;
    }
    async updateRequisition(requisitionId, userId, dto) {
        const requisition = await this.requisitionRepository.findOne({
            where: { requisitionId },
            relations: ['items', 'status'],
        });
        if (!requisition) {
            throw new common_1.NotFoundException('Requisición no encontrada');
        }
        if (requisition.createdBy !== userId) {
            throw new common_1.ForbiddenException('Solo el creador puede modificar la requisición');
        }
        const editableStatuses = [
            'pendiente',
            'rechazada_revisor',
            'rechazada_gerencia',
        ];
        if (!editableStatuses.includes(requisition.status.code)) {
            throw new common_1.BadRequestException('Esta requisición ya no puede ser modificada');
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const previousStatus = requisition.status.code;
            if (dto.companyId) {
                requisition.companyId = dto.companyId;
                requisition.operationCenterId = await this.determineOperationCenter(dto.companyId, dto.projectId);
                const projectCodeId = await this.determineProjectCode(dto.companyId, dto.projectId);
                if (projectCodeId !== undefined) {
                    requisition.projectCodeId = projectCodeId;
                }
            }
            if (dto.projectId !== undefined) {
                requisition.projectId = dto.projectId;
            }
            let newStatusCode = previousStatus;
            if (previousStatus === 'rechazada_revisor' || previousStatus === 'rechazada_gerencia') {
                const pendingStatusId = await this.getStatusIdByCode('pendiente');
                requisition.statusId = pendingStatusId;
                requisition.status = undefined;
                newStatusCode = 'pendiente';
            }
            await queryRunner.manager.save(requisition_entity_1.Requisition, requisition);
            if (dto.items) {
                const oldItems = await queryRunner.manager.find(requisition_item_entity_1.RequisitionItem, {
                    where: { requisitionId },
                    order: { itemNumber: 'ASC' },
                });
                const oldItemsMap = new Map(oldItems.map((item) => [item.itemNumber, item]));
                const itemsToInvalidate = [];
                dto.items.forEach((newItem, index) => {
                    const itemNumber = index + 1;
                    const oldItem = oldItemsMap.get(itemNumber);
                    if (oldItem) {
                        const materialChanged = oldItem.materialId !== newItem.materialId;
                        const quantityChanged = parseFloat(oldItem.quantity.toString()) !== newItem.quantity;
                        const observationChanged = (oldItem.observation || '') !== (newItem.observation || '');
                        if (materialChanged || quantityChanged || observationChanged) {
                            itemsToInvalidate.push({
                                itemNumber: oldItem.itemNumber,
                                materialId: oldItem.materialId,
                            });
                        }
                    }
                });
                oldItems.forEach((oldItem) => {
                    if (dto.items && oldItem.itemNumber > dto.items.length) {
                        itemsToInvalidate.push({
                            itemNumber: oldItem.itemNumber,
                            materialId: oldItem.materialId,
                        });
                    }
                });
                await this.invalidateItemApprovalsByContent(requisitionId, itemsToInvalidate, queryRunner);
                await queryRunner.manager.delete(requisition_item_entity_1.RequisitionItem, {
                    requisitionId,
                });
                const items = dto.items.map((item, index) => queryRunner.manager.create(requisition_item_entity_1.RequisitionItem, {
                    requisitionId,
                    itemNumber: index + 1,
                    materialId: item.materialId,
                    quantity: item.quantity,
                    observation: item.observation,
                }));
                await queryRunner.manager.save(requisition_item_entity_1.RequisitionItem, items);
            }
            let logAction = 'editar_requisicion';
            let logComments = 'Requisición actualizada';
            if (previousStatus === 'rechazada_revisor' || previousStatus === 'rechazada_gerencia') {
                logAction = 'reenviar_requisicion';
                logComments = `Requisición corregida y reenviada después de ser rechazada`;
            }
            const log = queryRunner.manager.create(requisition_log_entity_1.RequisitionLog, {
                requisitionId,
                userId,
                action: logAction,
                previousStatus,
                newStatus: newStatusCode,
                comments: logComments,
            });
            await queryRunner.manager.save(log);
            await queryRunner.commitTransaction();
            return this.getRequisitionById(requisitionId, userId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async deleteRequisition(requisitionId, userId) {
        const requisition = await this.requisitionRepository.findOne({
            where: { requisitionId },
            relations: ['status'],
        });
        if (!requisition) {
            throw new common_1.NotFoundException('Requisición no encontrada');
        }
        if (requisition.createdBy !== userId) {
            throw new common_1.ForbiddenException('Solo el creador puede eliminar la requisición');
        }
        if (requisition.status.code !== 'pendiente') {
            throw new common_1.BadRequestException('Solo se pueden eliminar requisiciones en estado pendiente');
        }
        await this.requisitionRepository.remove(requisition);
        return { message: 'Requisición eliminada exitosamente' };
    }
    async getPendingActions(userId, filters) {
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const authorizations = await this.authorizationRepository.find({
            where: {
                usuarioAutorizadorId: userId,
                esActivo: true,
            },
            relations: ['usuarioAutorizado'],
        });
        const subordinateIds = authorizations.map((auth) => auth.usuarioAutorizadoId);
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const roleName = user.role.nombreRol;
        if (roleName.includes('Director') && subordinateIds.length === 0) {
            return {
                data: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
                pending: [],
                processed: [],
            };
        }
        const queryBuilder = this.requisitionRepository
            .createQueryBuilder('requisition')
            .leftJoinAndSelect('requisition.status', 'requisitionStatus')
            .leftJoinAndSelect('requisition.company', 'company')
            .leftJoinAndSelect('requisition.project', 'project')
            .leftJoinAndSelect('requisition.creator', 'creator')
            .leftJoinAndSelect('creator.role', 'creatorRole')
            .leftJoinAndSelect('requisition.items', 'items')
            .leftJoinAndSelect('items.material', 'material')
            .leftJoinAndSelect('requisition.approvals', 'approvals')
            .leftJoinAndSelect('approvals.user', 'approvalUser')
            .leftJoinAndSelect('approvals.newStatus', 'approvalNewStatus');
        if (roleName === 'Gerencia') {
            if (subordinateIds.length > 0) {
                queryBuilder.where(`(requisitionStatus.code IN ('aprobada_revisor', 'aprobada_gerencia', 'rechazada_gerencia', 'cotizada', 'en_orden_compra', 'pendiente_recepcion')) OR
           (requisitionStatus.code = 'pendiente' AND requisition.createdBy IN (:...subordinateIds))`, { subordinateIds });
            }
            else {
                queryBuilder.where('requisitionStatus.code IN (:...statuses)', {
                    statuses: ['aprobada_revisor', 'aprobada_gerencia', 'rechazada_gerencia', 'cotizada', 'en_orden_compra', 'pendiente_recepcion'],
                });
            }
        }
        else if (roleName.includes('Director')) {
            queryBuilder.where('requisition.createdBy IN (:...subordinateIds)', {
                subordinateIds,
            });
        }
        else if (roleName === 'Compras') {
            queryBuilder.where('requisitionStatus.code IN (:...statuses)', {
                statuses: ['aprobada_gerencia', 'cotizada', 'en_orden_compra', 'pendiente_recepcion'],
            });
        }
        queryBuilder.orderBy('requisition.createdAt', 'DESC');
        const [allRequisitions, total] = await queryBuilder.getManyAndCount();
        const pending = [];
        const processed = [];
        for (const req of allRequisitions) {
            let isPending = false;
            let lastActionDate = req.updatedAt || req.createdAt;
            let lastActionLabel = 'Creada';
            if (roleName.includes('Director')) {
                isPending = ['pendiente', 'en_revision'].includes(req.status.code);
                if (!isPending) {
                    const approval = req.approvals?.find(a => ['aprobada_revisor', 'rechazada_revisor'].includes(a.newStatus?.code));
                    if (approval) {
                        lastActionDate = approval.createdAt;
                        lastActionLabel = approval.newStatus.code === 'aprobada_revisor' ? 'Aprobada' : 'Rechazada';
                    }
                    else {
                        if (req.status.code === 'aprobada_revisor') {
                            lastActionLabel = 'Aprobada por revisor';
                        }
                        else if (req.status.code === 'rechazada_revisor') {
                            lastActionLabel = 'Rechazada por revisor';
                        }
                        else if (req.status.code === 'aprobada_gerencia') {
                            lastActionLabel = 'Aprobada por gerencia';
                        }
                        else if (req.status.code === 'rechazada_gerencia') {
                            lastActionLabel = 'Rechazada por gerencia';
                        }
                    }
                }
            }
            else if (roleName === 'Gerencia') {
                isPending = req.status.code === 'aprobada_revisor' ||
                    (req.status.code === 'pendiente' && subordinateIds.includes(req.createdBy));
                if (!isPending) {
                    const approval = req.approvals?.find(a => ['aprobada_gerencia', 'rechazada_gerencia'].includes(a.newStatus?.code));
                    if (approval) {
                        lastActionDate = approval.createdAt;
                        lastActionLabel = approval.newStatus.code === 'aprobada_gerencia' ? 'Aprobada' : 'Rechazada';
                    }
                    else {
                        if (req.status.code === 'aprobada_gerencia') {
                            lastActionLabel = 'Aprobada por gerencia';
                        }
                        else if (req.status.code === 'rechazada_gerencia') {
                            lastActionLabel = 'Rechazada por gerencia';
                        }
                        else if (req.status.code === 'cotizada') {
                            lastActionLabel = 'Cotizada';
                        }
                        else if (req.status.code === 'en_orden_compra') {
                            lastActionLabel = 'En orden de compra';
                        }
                    }
                }
            }
            else if (roleName === 'Compras') {
                isPending = req.status.code === 'aprobada_gerencia';
                if (!isPending) {
                    const approval = req.approvals?.find(a => ['cotizada', 'en_orden_compra'].includes(a.newStatus?.code));
                    if (approval) {
                        lastActionDate = approval.createdAt;
                        lastActionLabel = approval.newStatus.code === 'cotizada' ? 'Cotizada' :
                            approval.newStatus.code === 'en_orden_compra' ? 'En Orden de Compra' : 'Procesada';
                    }
                    else {
                        if (req.status.code === 'cotizada') {
                            lastActionLabel = 'Cotizada';
                        }
                        else if (req.status.code === 'en_orden_compra') {
                            lastActionLabel = 'En orden de compra';
                        }
                        else if (req.status.code === 'pendiente_recepcion') {
                            lastActionLabel = 'Pendiente de recepción';
                        }
                    }
                }
            }
            const slaBusinessDays = (0, business_days_util_1.getSLAForStatus)(req.status.code);
            let slaDeadline = null;
            let isOverdue = false;
            let daysOverdue = 0;
            if (slaBusinessDays > 0) {
                const statusChangeApproval = req.approvals?.find(a => a.newStatus?.code === req.status.code);
                const slaStartDate = statusChangeApproval?.createdAt || req.createdAt;
                const slaResult = (0, business_days_util_1.calculateSLA)(slaStartDate, slaBusinessDays);
                slaDeadline = slaResult.deadline;
                isOverdue = slaResult.isOverdue;
                daysOverdue = slaResult.daysOverdue;
            }
            const reqWithMeta = {
                ...req,
                isPending,
                lastActionDate,
                lastActionLabel,
                slaDeadline,
                isOverdue,
                daysOverdue,
            };
            if (isPending) {
                pending.push(reqWithMeta);
            }
            else {
                processed.push(reqWithMeta);
            }
        }
        pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        processed.sort((a, b) => new Date(b.lastActionDate).getTime() - new Date(a.lastActionDate).getTime());
        const sortedRequisitions = [...pending, ...processed];
        const skip = (page - 1) * limit;
        const paginatedData = sortedRequisitions.slice(skip, skip + limit);
        return {
            data: paginatedData,
            total: sortedRequisitions.length,
            page,
            limit,
            totalPages: Math.ceil(sortedRequisitions.length / limit),
            pending: pending.length,
            processed: processed.length,
        };
    }
    async reviewRequisition(requisitionId, userId, dto) {
        const requisition = await this.requisitionRepository.findOne({
            where: { requisitionId },
            relations: ['creator', 'status'],
        });
        if (!requisition) {
            throw new common_1.NotFoundException('Requisición no encontrada');
        }
        const isAuthorizer = await this.isAuthorizer(userId, requisition.createdBy);
        if (!isAuthorizer) {
            throw new common_1.ForbiddenException('No tiene permiso para revisar esta requisición');
        }
        if (requisition.status.code !== 'pendiente' &&
            requisition.status.code !== 'en_revision') {
            throw new common_1.BadRequestException('Esta requisición no puede ser revisada en su estado actual');
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const previousStatus = requisition.status.code;
            let newStatusCode;
            let action;
            if (dto.decision === 'approve') {
                newStatusCode = 'aprobada_revisor';
                action = 'revisar_aprobar';
            }
            else {
                newStatusCode = 'rechazada_revisor';
                action = 'revisar_rechazar';
            }
            const newStatusId = await this.getStatusIdByCode(newStatusCode);
            await queryRunner.manager.update(requisition_entity_1.Requisition, requisitionId, {
                statusId: newStatusId,
                reviewedBy: userId,
                reviewedAt: new Date(),
            });
            const log = queryRunner.manager.create(requisition_log_entity_1.RequisitionLog, {
                requisitionId,
                userId,
                action,
                previousStatus,
                newStatus: newStatusCode,
                comments: dto.comments ||
                    `Requisición ${dto.decision === 'approve' ? 'aprobada' : 'rechazada'} por revisor`,
            });
            await queryRunner.manager.save(log);
            if (dto.itemDecisions && dto.itemDecisions.length > 0) {
                await this.saveItemApprovals(requisitionId, userId, 'reviewer', dto.itemDecisions, queryRunner);
            }
            await queryRunner.commitTransaction();
            return this.getRequisitionById(requisitionId, userId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async approveRequisition(requisitionId, userId, dto) {
        const requisition = await this.requisitionRepository.findOne({
            where: { requisitionId },
            relations: ['status'],
        });
        if (!requisition) {
            throw new common_1.NotFoundException('Requisición no encontrada');
        }
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (user?.role.nombreRol !== 'Gerencia') {
            throw new common_1.ForbiddenException('Solo Gerencia puede aprobar requisiciones');
        }
        const validStatuses = ['pendiente', 'aprobada_revisor'];
        if (!validStatuses.includes(requisition.status.code)) {
            throw new common_1.BadRequestException(`Esta requisición no puede ser aprobada en su estado actual: ${requisition.status.code}`);
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const previousStatus = requisition.status.code;
            const approvedStatusId = await this.getStatusIdByCode('aprobada_gerencia');
            await queryRunner.manager.update(requisition_entity_1.Requisition, requisitionId, {
                statusId: approvedStatusId,
                approvedBy: userId,
                approvedAt: new Date(),
            });
            const log = queryRunner.manager.create(requisition_log_entity_1.RequisitionLog, {
                requisitionId,
                userId,
                action: 'aprobar_gerencia',
                previousStatus,
                newStatus: 'aprobada_gerencia',
                comments: dto.comments || 'Requisición aprobada por gerencia',
            });
            await queryRunner.manager.save(log);
            if (dto.itemDecisions && dto.itemDecisions.length > 0) {
                await this.saveItemApprovals(requisitionId, userId, 'management', dto.itemDecisions, queryRunner);
            }
            await queryRunner.commitTransaction();
            return this.getRequisitionById(requisitionId, userId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async rejectRequisitionByManager(requisitionId, userId, dto) {
        const requisition = await this.requisitionRepository.findOne({
            where: { requisitionId },
            relations: ['status'],
        });
        if (!requisition) {
            throw new common_1.NotFoundException('Requisición no encontrada');
        }
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (user?.role.nombreRol !== 'Gerencia') {
            throw new common_1.ForbiddenException('Solo Gerencia puede rechazar requisiciones');
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const previousStatus = requisition.status.code;
            const rejectedStatusId = await this.getStatusIdByCode('rechazada_gerencia');
            await queryRunner.manager.update(requisition_entity_1.Requisition, requisitionId, {
                statusId: rejectedStatusId,
            });
            const log = queryRunner.manager.create(requisition_log_entity_1.RequisitionLog, {
                requisitionId,
                userId,
                action: 'rechazar_gerencia',
                previousStatus,
                newStatus: 'rechazada_gerencia',
                comments: dto.comments,
            });
            await queryRunner.manager.save(log);
            await queryRunner.commitTransaction();
            return this.getRequisitionById(requisitionId, userId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async generateRequisitionNumber(companyId, projectId, queryRunner) {
        const prefix = await this.requisitionPrefixRepository.findOne({
            where: {
                companyId,
                projectId: projectId !== undefined ? projectId : (0, typeorm_2.IsNull)(),
            },
        });
        if (!prefix) {
            throw new common_1.NotFoundException(`No se encontró prefijo para companyId=${companyId}, projectId=${projectId}. Verifica que exista un prefijo configurado para esta combinación.`);
        }
        const sequence = await queryRunner.manager.findOne(requisition_sequence_entity_1.RequisitionSequence, {
            where: { prefixId: prefix.prefixId },
            lock: { mode: 'pessimistic_write' },
        });
        if (!sequence) {
            throw new common_1.NotFoundException('Secuencia no encontrada');
        }
        sequence.lastNumber += 1;
        await queryRunner.manager.save(sequence);
        const formattedNumber = String(sequence.lastNumber).padStart(3, '0');
        return `${prefix.prefix}-${formattedNumber}`;
    }
    async determineOperationCenter(companyId, projectId) {
        const operationCenter = await this.operationCenterRepository.findOne({
            where: {
                companyId,
                projectId: projectId !== undefined ? projectId : (0, typeorm_2.IsNull)(),
            },
        });
        if (!operationCenter) {
            throw new common_1.NotFoundException(`Centro de operación no encontrado para companyId=${companyId}, projectId=${projectId}`);
        }
        return operationCenter.centerId;
    }
    async determineProjectCode(companyId, projectId) {
        const projectCode = await this.projectCodeRepository.findOne({
            where: {
                companyId,
                projectId: projectId !== undefined ? projectId : (0, typeorm_2.IsNull)(),
            },
        });
        return projectCode?.codeId;
    }
    async validateUserCanCreate(user) {
        const restrictedRoles = ['Gerencia', 'Compras'];
        if (restrictedRoles.includes(user.role.nombreRol)) {
            throw new common_1.ForbiddenException('Su rol no puede crear requisiciones');
        }
    }
    async isAuthorizer(autorizadorId, autorizadoId) {
        const authorization = await this.authorizationRepository.findOne({
            where: {
                usuarioAutorizadorId: autorizadorId,
                usuarioAutorizadoId: autorizadoId,
                esActivo: true,
            },
        });
        return !!authorization;
    }
    async canViewRequisition(requisition, userId) {
        if (requisition.createdBy === userId) {
            return true;
        }
        const isAuthorizer = await this.isAuthorizer(userId, requisition.createdBy);
        if (isAuthorizer) {
            return true;
        }
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (user?.role.nombreRol === 'Gerencia') {
            let status = requisition.status;
            if (!status) {
                const fullRequisition = await this.requisitionRepository.findOne({
                    where: { requisitionId: requisition.requisitionId },
                    relations: ['status'],
                });
                if (fullRequisition?.status) {
                    status = fullRequisition.status;
                }
            }
            if (status?.code === 'aprobada_revisor' ||
                status?.code === 'pendiente' ||
                status?.code === 'aprobada_gerencia' ||
                status?.code === 'rechazada_gerencia') {
                return true;
            }
        }
        return false;
    }
    async getRequisitionsForQuotation(userId, filters) {
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (user.role.nombreRol !== 'Compras') {
            throw new common_1.ForbiddenException('Solo el rol Compras puede gestionar cotizaciones');
        }
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const queryBuilder = this.requisitionRepository
            .createQueryBuilder('requisition')
            .leftJoinAndSelect('requisition.status', 'requisitionStatus')
            .leftJoinAndSelect('requisition.company', 'company')
            .leftJoinAndSelect('requisition.project', 'project')
            .leftJoinAndSelect('requisition.creator', 'creator')
            .leftJoinAndSelect('creator.role', 'creatorRole')
            .leftJoinAndSelect('requisition.items', 'items')
            .leftJoinAndSelect('items.material', 'material')
            .leftJoinAndSelect('requisition.approvals', 'approvals')
            .leftJoinAndSelect('approvals.user', 'approvalUser')
            .leftJoinAndSelect('approvals.newStatus', 'approvalNewStatus');
        const pendingQueryBuilder = queryBuilder.clone()
            .where('requisitionStatus.code IN (:...statuses)', {
            statuses: ['aprobada_gerencia', 'en_cotizacion']
        })
            .orderBy('requisition.createdAt', 'DESC');
        const [pendingRequisitions, pendingTotal] = await pendingQueryBuilder.getManyAndCount();
        const processedQueryBuilder = queryBuilder.clone()
            .where('requisitionStatus.code IN (:...statuses)', {
            statuses: ['cotizada', 'en_orden_compra', 'pendiente_recepcion', 'en_recepcion', 'recepcion_completa']
        })
            .orderBy('requisition.createdAt', 'DESC')
            .take(20);
        const [processedRequisitions, processedTotal] = await processedQueryBuilder.getManyAndCount();
        const requisitions = [...pendingRequisitions, ...processedRequisitions];
        const total = pendingTotal + processedTotal;
        const requisitionsWithSLA = requisitions.map(req => {
            const slaBusinessDays = (0, business_days_util_1.getSLAForStatus)(req.status.code);
            let slaDeadline = null;
            let isOverdue = false;
            let daysOverdue = 0;
            if (slaBusinessDays > 0) {
                const statusChangeApproval = req.approvals?.find(a => a.newStatus?.code === req.status.code);
                const slaStartDate = statusChangeApproval?.createdAt || req.createdAt;
                const slaResult = (0, business_days_util_1.calculateSLA)(slaStartDate, slaBusinessDays);
                slaDeadline = slaResult.deadline;
                isOverdue = slaResult.isOverdue;
                daysOverdue = slaResult.daysOverdue;
            }
            return {
                ...req,
                slaDeadline,
                isOverdue,
                daysOverdue,
            };
        });
        return {
            data: requisitionsWithSLA,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getRequisitionQuotation(requisitionId, userId) {
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (user.role.nombreRol !== 'Compras') {
            throw new common_1.ForbiddenException('Solo el rol Compras puede gestionar cotizaciones');
        }
        const requisition = await this.requisitionRepository.findOne({
            where: { requisitionId },
            relations: [
                'company',
                'project',
                'creator',
                'creator.role',
                'items',
                'items.material',
                'items.material.materialGroup',
                'status',
                'operationCenter',
                'projectCode',
                'purchaseOrders',
                'purchaseOrders.approvalStatus',
            ],
        });
        if (!requisition) {
            throw new common_1.NotFoundException('Requisición no encontrada');
        }
        const validStatuses = [
            'aprobada_gerencia',
            'en_cotizacion',
            'cotizada',
            'en_orden_compra',
            'pendiente_recepcion',
        ];
        if (!validStatuses.includes(requisition.status.code)) {
            throw new common_1.BadRequestException(`Esta requisición no está disponible para visualización. Estado actual: ${requisition.status.code}`);
        }
        const itemsWithQuotations = await Promise.all(requisition.items.map(async (item) => {
            const quotations = await this.quotationRepository.find({
                where: {
                    requisitionItemId: item.itemId,
                    isActive: true,
                },
                relations: ['supplier'],
                order: { supplierOrder: 'ASC' },
            });
            return {
                ...item,
                quotations,
            };
        }));
        return {
            ...requisition,
            items: itemsWithQuotations,
        };
    }
    async manageQuotation(requisitionId, userId, dto) {
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (user.role.nombreRol !== 'Compras') {
            throw new common_1.ForbiddenException('Solo el rol Compras puede gestionar cotizaciones');
        }
        const requisition = await this.requisitionRepository.findOne({
            where: { requisitionId },
            relations: ['items', 'status'],
        });
        if (!requisition) {
            throw new common_1.NotFoundException('Requisición no encontrada');
        }
        const validStatuses = ['aprobada_gerencia', 'en_cotizacion', 'cotizada'];
        if (!validStatuses.includes(requisition.status.code)) {
            throw new common_1.BadRequestException(`Esta requisición no está disponible para cotización. Estado actual: ${requisition.status.code}. Solo se pueden gestionar requisiciones en estado: aprobada_gerencia, en_cotizacion, o cotizada (sin órdenes de compra).`);
        }
        const existingOrdersCount = await this.purchaseOrderRepository.count({
            where: { requisitionId },
        });
        if (existingOrdersCount > 0) {
            throw new common_1.BadRequestException(`No se pueden modificar las cotizaciones porque ya existen ${existingOrdersCount} orden(es) de compra creada(s) para esta requisición.`);
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const previousStatus = requisition.status.code;
            for (const itemDto of dto.items) {
                const item = requisition.items.find((i) => i.itemId === itemDto.itemId);
                if (!item) {
                    throw new common_1.BadRequestException(`Ítem con ID ${itemDto.itemId} no encontrado en la requisición`);
                }
                const currentQuotations = await queryRunner.manager.find(requisition_item_quotation_entity_1.RequisitionItemQuotation, {
                    where: {
                        requisitionItemId: item.itemId,
                        isActive: true,
                    },
                });
                let needsNewVersion = false;
                if (itemDto.action === 'cotizar' && itemDto.suppliers) {
                    const currentSupplierIds = currentQuotations
                        .filter((q) => q.action === 'cotizar')
                        .map((q) => q.supplierId)
                        .sort();
                    const newSupplierIds = itemDto.suppliers
                        .map((s) => s.supplierId)
                        .sort();
                    needsNewVersion =
                        currentSupplierIds.length > 0 &&
                            JSON.stringify(currentSupplierIds) !==
                                JSON.stringify(newSupplierIds);
                }
                if (needsNewVersion || (currentQuotations.length > 0 && currentQuotations[0].action !== itemDto.action)) {
                    await queryRunner.manager.update(requisition_item_quotation_entity_1.RequisitionItemQuotation, { requisitionItemId: item.itemId, isActive: true }, { isActive: false });
                }
                const maxVersion = currentQuotations.reduce((max, q) => Math.max(max, q.version), 0);
                const newVersion = needsNewVersion ? maxVersion + 1 : maxVersion || 1;
                if (itemDto.action === 'cotizar' && itemDto.suppliers) {
                    for (const supplierDto of itemDto.suppliers) {
                        const supplier = await queryRunner.manager.findOne(supplier_entity_1.Supplier, {
                            where: { supplierId: supplierDto.supplierId, isActive: true },
                        });
                        if (!supplier) {
                            throw new common_1.BadRequestException(`Proveedor con ID ${supplierDto.supplierId} no encontrado o inactivo`);
                        }
                        const quotation = queryRunner.manager.create(requisition_item_quotation_entity_1.RequisitionItemQuotation, {
                            requisitionItemId: item.itemId,
                            action: 'cotizar',
                            supplierId: supplierDto.supplierId,
                            supplierOrder: supplierDto.supplierOrder,
                            observations: supplierDto.observations,
                            version: newVersion,
                            isActive: true,
                            createdBy: userId,
                        });
                        await queryRunner.manager.save(quotation);
                    }
                }
                else if (itemDto.action === 'no_requiere') {
                    const quotation = queryRunner.manager.create(requisition_item_quotation_entity_1.RequisitionItemQuotation, {
                        requisitionItemId: item.itemId,
                        action: 'no_requiere',
                        supplierId: null,
                        supplierOrder: 1,
                        justification: itemDto.justification,
                        version: newVersion,
                        isActive: true,
                        createdBy: userId,
                    });
                    await queryRunner.manager.save(quotation);
                }
            }
            const totalItems = requisition.items.length;
            const itemsWithActionRaw = await queryRunner.manager
                .createQueryBuilder(requisition_item_quotation_entity_1.RequisitionItemQuotation, 'q')
                .select('DISTINCT q.requisitionItemId', 'itemId')
                .where('q.requisitionItemId IN (:...itemIds)', {
                itemIds: requisition.items.map((i) => i.itemId),
            })
                .andWhere('q.isActive = :isActive', { isActive: true })
                .getRawMany();
            const itemsWithAction = itemsWithActionRaw.length;
            console.log('🔍 DEBUG - Verificación de estado:');
            console.log(`  Total de ítems en requisición: ${totalItems}`);
            console.log(`  Ítems con quotations activas: ${itemsWithAction}`);
            console.log(`  IDs de ítems con action:`, itemsWithActionRaw);
            let newStatusCode;
            if (itemsWithAction === totalItems) {
                newStatusCode = 'cotizada';
                console.log(`  ✅ Estado cambiará a: ${newStatusCode}`);
            }
            else {
                newStatusCode = 'en_cotizacion';
                console.log(`  ⏳ Estado cambiará a: ${newStatusCode}`);
            }
            const newStatusId = await this.getStatusIdByCode(newStatusCode);
            await queryRunner.manager.update(requisition_entity_1.Requisition, { requisitionId }, { statusId: newStatusId });
            console.log(`  💾 Estado actualizado en BD: requisitionId=${requisitionId}, newStatusId=${newStatusId}`);
            const log = queryRunner.manager.create(requisition_log_entity_1.RequisitionLog, {
                requisitionId,
                userId,
                action: 'gestionar_cotizacion',
                previousStatus,
                newStatus: newStatusCode,
                comments: `Cotizaciones actualizadas para ${dto.items.length} ítems`,
            });
            await queryRunner.manager.save(log);
            await queryRunner.commitTransaction();
            return this.getRequisitionQuotation(requisitionId, userId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async assignPrices(requisitionId, userId, dto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const requisition = await queryRunner.manager.findOne(requisition_entity_1.Requisition, {
                where: { requisitionId },
                relations: ['status', 'operationCenter'],
            });
            if (!requisition) {
                throw new common_1.NotFoundException(`Requisición con ID ${requisitionId} no encontrada`);
            }
            if (requisition.status.code !== 'cotizada') {
                throw new common_1.BadRequestException(`Solo se pueden asignar precios a requisiciones en estado "cotizada". Estado actual: ${requisition.status.code}`);
            }
            const existingOrdersCount = await this.purchaseOrderRepository.count({
                where: { requisitionId },
            });
            if (existingOrdersCount > 0) {
                throw new common_1.BadRequestException(`No se pueden asignar precios porque ya existen ${existingOrdersCount} orden(es) de compra creada(s) para esta requisición.`);
            }
            for (const itemDto of dto.items) {
                const quotations = await queryRunner.manager.find(requisition_item_quotation_entity_1.RequisitionItemQuotation, {
                    where: {
                        requisitionItemId: itemDto.itemId,
                        isActive: true,
                        action: 'cotizar',
                    },
                });
                if (quotations.length === 0) {
                    throw new common_1.BadRequestException(`No se encontraron cotizaciones activas para el ítem ${itemDto.itemId}`);
                }
                let targetQuotation = quotations[0];
                if (itemDto.quotationId) {
                    const foundQuotation = quotations.find((q) => q.quotationId === itemDto.quotationId);
                    if (!foundQuotation) {
                        throw new common_1.BadRequestException(`Cotización ${itemDto.quotationId} no encontrada o no activa para el ítem ${itemDto.itemId}`);
                    }
                    targetQuotation = foundQuotation;
                }
                await queryRunner.manager.update(requisition_item_quotation_entity_1.RequisitionItemQuotation, { quotationId: targetQuotation.quotationId }, {
                    unitPrice: itemDto.unitPrice,
                    hasIva: itemDto.hasIva,
                    discount: itemDto.discount || 0,
                    isSelected: true,
                });
                if (quotations.length > 1) {
                    const otherQuotations = quotations.filter((q) => q.quotationId !== targetQuotation.quotationId);
                    for (const otherQuotation of otherQuotations) {
                        await queryRunner.manager.update(requisition_item_quotation_entity_1.RequisitionItemQuotation, { quotationId: otherQuotation.quotationId }, { isSelected: false });
                    }
                }
            }
            const log = queryRunner.manager.create(requisition_log_entity_1.RequisitionLog, {
                requisitionId,
                userId,
                action: 'asignar_precios',
                previousStatus: requisition.status.code,
                newStatus: requisition.status.code,
                comments: `Precios asignados a ${dto.items.length} ítem(s)`,
            });
            await queryRunner.manager.save(log);
            await queryRunner.commitTransaction();
            return this.getRequisitionQuotation(requisitionId, userId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async createPurchaseOrders(requisitionId, userId, dto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const requisition = await queryRunner.manager.findOne(requisition_entity_1.Requisition, {
                where: { requisitionId },
                relations: [
                    'items',
                    'items.material',
                    'operationCenter',
                    'operationCenter.company',
                    'status',
                ],
            });
            if (!requisition) {
                throw new common_1.NotFoundException('Requisición no encontrada');
            }
            if (requisition.status.code !== 'cotizada') {
                throw new common_1.BadRequestException('La requisición debe estar en estado "cotizada" para generar órdenes de compra');
            }
            const itemIds = dto.items.map((i) => i.itemId);
            const quotations = await queryRunner.manager.find(requisition_item_quotation_entity_1.RequisitionItemQuotation, {
                where: {
                    requisitionItemId: (0, typeorm_2.In)(itemIds),
                    isActive: true,
                },
                relations: ['requisitionItem', 'requisitionItem.material', 'supplier'],
            });
            const itemsBySupplier = new Map();
            for (const itemDto of dto.items) {
                const quotation = quotations.find((q) => q.requisitionItemId === itemDto.itemId &&
                    q.supplierId === itemDto.supplierId);
                if (!quotation) {
                    throw new common_1.NotFoundException(`No se encontró cotización activa para el ítem ${itemDto.itemId} del proveedor ${itemDto.supplierId}`);
                }
                if (!itemsBySupplier.has(itemDto.supplierId)) {
                    itemsBySupplier.set(itemDto.supplierId, []);
                }
                itemsBySupplier
                    .get(itemDto.supplierId)
                    .push({ item: itemDto, quotation });
            }
            const createdPurchaseOrders = [];
            for (const [supplierId, items] of itemsBySupplier.entries()) {
                const operationCenterId = requisition.operationCenter.centerId;
                const operationCenterCode = requisition.operationCenter.code;
                const companyName = requisition.operationCenter.company.name;
                const orderType = companyName.includes('Unión Temporal') ? 'OC' : 'OS';
                let sequence = await queryRunner.manager.findOne(purchase_order_sequence_entity_1.PurchaseOrderSequence, {
                    where: { operationCenterId },
                    lock: { mode: 'pessimistic_write' },
                });
                if (!sequence) {
                    sequence = queryRunner.manager.create(purchase_order_sequence_entity_1.PurchaseOrderSequence, {
                        operationCenterId,
                        lastNumber: 0,
                    });
                }
                sequence.lastNumber += 1;
                await queryRunner.manager.save(sequence);
                const consecutiveStr = sequence.lastNumber.toString().padStart(4, '0');
                const purchaseOrderNumber = `${operationCenterCode}-${orderType}-${consecutiveStr}`;
                let orderSubtotal = 0;
                let orderTotalIva = 0;
                let orderTotalDiscount = 0;
                const orderItems = [];
                for (const { item, quotation } of items) {
                    const quantity = quotation.requisitionItem.quantity;
                    const unitPrice = item.unitPrice;
                    const hasIva = item.hasIVA ?? true;
                    const discount = item.discount ?? 0;
                    const subtotal = quantity * unitPrice;
                    const ivaAmount = hasIva ? subtotal * 0.19 : 0;
                    const totalAmount = subtotal + ivaAmount - discount;
                    orderSubtotal += subtotal;
                    orderTotalIva += ivaAmount;
                    orderTotalDiscount += discount;
                    orderItems.push({
                        requisitionItemId: quotation.requisitionItemId,
                        quotationId: quotation.quotationId,
                        quantity,
                        unitPrice,
                        hasIva,
                        ivaPercentage: 19,
                        subtotal,
                        ivaAmount,
                        discount,
                        totalAmount,
                    });
                }
                const orderTotalAmount = orderSubtotal + orderTotalIva - orderTotalDiscount;
                const pendingApprovalStatusId = await this.getPurchaseOrderStatusId('pendiente_aprobacion_gerencia');
                const purchaseOrder = queryRunner.manager.create(purchase_order_entity_1.PurchaseOrder, {
                    purchaseOrderNumber,
                    requisitionId,
                    supplierId,
                    issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
                    subtotal: orderSubtotal,
                    totalIva: orderTotalIva,
                    totalDiscount: orderTotalDiscount,
                    totalAmount: orderTotalAmount,
                    approvalStatusId: pendingApprovalStatusId,
                    createdBy: userId,
                });
                await queryRunner.manager.save(purchaseOrder);
                for (let i = 0; i < orderItems.length; i++) {
                    const itemData = orderItems[i];
                    const { item, quotation } = items[i];
                    const poItem = queryRunner.manager.create(purchase_order_item_entity_1.PurchaseOrderItem, {
                        purchaseOrderId: purchaseOrder.purchaseOrderId,
                        ...itemData,
                    });
                    await queryRunner.manager.save(poItem);
                    const priceHistory = queryRunner.manager.create(material_price_history_entity_1.MaterialPriceHistory, {
                        materialId: quotation.requisitionItem.material.materialId,
                        supplierId,
                        unitPrice: itemData.unitPrice,
                        hasIva: itemData.hasIva,
                        ivaPercentage: itemData.ivaPercentage,
                        discount: itemData.discount,
                        purchaseOrderItemId: poItem.poItemId,
                        purchaseOrderId: purchaseOrder.purchaseOrderId,
                        createdBy: userId,
                    });
                    await queryRunner.manager.save(priceHistory);
                }
                createdPurchaseOrders.push(purchaseOrder);
            }
            const previousStatus = requisition.status.code;
            const newStatusId = await this.getStatusIdByCode('en_orden_compra');
            await queryRunner.manager.update(requisition_entity_1.Requisition, { requisitionId }, { statusId: newStatusId });
            const log = queryRunner.manager.create(requisition_log_entity_1.RequisitionLog, {
                requisitionId,
                userId,
                action: 'crear_ordenes_compra',
                previousStatus,
                newStatus: 'en_orden_compra',
                comments: `Se generaron ${createdPurchaseOrders.length} orden(es) de compra`,
            });
            await queryRunner.manager.save(log);
            await queryRunner.commitTransaction();
            const ordersWithRelations = await this.purchaseOrderRepository.find({
                where: {
                    purchaseOrderId: (0, typeorm_2.In)(createdPurchaseOrders.map((po) => po.purchaseOrderId)),
                },
                relations: ['supplier', 'items', 'items.requisitionItem', 'creator'],
            });
            return {
                requisitionId,
                previousStatus,
                newStatus: 'en_orden_compra',
                purchaseOrders: ordersWithRelations,
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async getLatestMaterialPrice(materialId, supplierId) {
        const latestPrice = await this.materialPriceHistoryRepository.findOne({
            where: {
                materialId,
                supplierId,
            },
            order: {
                createdAt: 'DESC',
            },
            relations: ['supplier', 'purchaseOrder'],
        });
        if (!latestPrice) {
            return null;
        }
        return {
            materialId: latestPrice.materialId,
            supplierId: latestPrice.supplierId,
            unitPrice: latestPrice.unitPrice,
            hasIva: latestPrice.hasIva,
            ivaPercentage: latestPrice.ivaPercentage,
            discount: latestPrice.discount,
            lastUsedDate: latestPrice.createdAt,
            purchaseOrderNumber: latestPrice.purchaseOrder?.purchaseOrderNumber,
            supplierName: latestPrice.supplier?.name,
        };
    }
    async getMyPendingReceipts(userId, filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const queryBuilder = this.requisitionRepository
            .createQueryBuilder('requisition')
            .leftJoinAndSelect('requisition.status', 'status')
            .leftJoinAndSelect('requisition.company', 'company')
            .leftJoinAndSelect('requisition.project', 'project')
            .leftJoinAndSelect('requisition.purchaseOrders', 'purchaseOrders')
            .leftJoinAndSelect('purchaseOrders.supplier', 'supplier')
            .leftJoinAndSelect('purchaseOrders.items', 'items')
            .leftJoinAndSelect('items.requisitionItem', 'requisitionItem')
            .leftJoinAndSelect('requisitionItem.material', 'material')
            .leftJoinAndSelect('items.receipts', 'receipts')
            .where('requisition.createdBy = :userId', { userId })
            .andWhere('status.code IN (:...statuses)', {
            statuses: ['pendiente_recepcion', 'en_recepcion', 'recepcion_completa'],
        })
            .orderBy('requisition.createdAt', 'ASC')
            .skip(skip)
            .take(limit);
        const [data, total] = await queryBuilder.getManyAndCount();
        const dataWithReceiptInfo = data.map((requisition) => ({
            ...requisition,
            purchaseOrders: (requisition.purchaseOrders || []).map((po) => ({
                ...po,
                items: (po.items || []).map((item) => {
                    const totalReceived = item.receipts?.reduce((sum, receipt) => sum + Number(receipt.quantityReceived), 0) || 0;
                    return {
                        ...item,
                        quantityOrdered: Number(item.quantity),
                        quantityReceived: totalReceived,
                        quantityPending: Number(item.quantity) - totalReceived,
                        receipts: item.receipts,
                    };
                }),
            })),
        }));
        return {
            data: dataWithReceiptInfo,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getRequisitionReceipts(requisitionId, userId) {
        const requisition = await this.requisitionRepository.findOne({
            where: { requisitionId },
            relations: [
                'status',
                'purchaseOrders',
                'purchaseOrders.supplier',
                'purchaseOrders.items',
                'purchaseOrders.items.requisitionItem',
                'purchaseOrders.items.requisitionItem.material',
                'purchaseOrders.items.receipts',
                'purchaseOrders.items.receipts.creator',
            ],
        });
        if (!requisition) {
            throw new common_1.NotFoundException('Requisición no encontrada');
        }
        if (requisition.createdBy !== userId) {
            throw new common_1.ForbiddenException('No tiene permiso para ver las recepciones de esta requisición');
        }
        if (!['pendiente_recepcion', 'en_recepcion', 'recepcion_completa'].includes(requisition.status.code)) {
            throw new common_1.BadRequestException('Esta requisición no está en proceso de recepción');
        }
        const dataWithReceiptInfo = {
            ...requisition,
            purchaseOrders: requisition.purchaseOrders?.map((po) => ({
                ...po,
                items: (po.items || []).map((item) => {
                    const totalReceived = item.receipts?.reduce((sum, receipt) => sum + Number(receipt.quantityReceived), 0) || 0;
                    return {
                        ...item,
                        quantityOrdered: Number(item.quantity),
                        quantityReceived: totalReceived,
                        quantityPending: Number(item.quantity) - totalReceived,
                    };
                }),
            })) || [],
        };
        return dataWithReceiptInfo;
    }
    async createMaterialReceipts(requisitionId, userId, dto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const requisition = await queryRunner.manager.findOne(requisition_entity_1.Requisition, {
                where: { requisitionId },
                relations: ['status', 'purchaseOrders', 'purchaseOrders.items'],
            });
            if (!requisition) {
                throw new common_1.NotFoundException('Requisición no encontrada');
            }
            if (requisition.createdBy !== userId) {
                throw new common_1.ForbiddenException('Solo el creador de la requisición puede registrar recepciones');
            }
            if (!['pendiente_recepcion', 'en_recepcion'].includes(requisition.status.code)) {
                throw new common_1.BadRequestException('Esta requisición no está disponible para recepción de materiales');
            }
            const approvedStatusId = await this.getPurchaseOrderStatusId('aprobada_gerencia');
            const unapprovedOrders = requisition.purchaseOrders?.filter(po => po.approvalStatusId !== approvedStatusId);
            if (unapprovedOrders && unapprovedOrders.length > 0) {
                const orderNumbers = unapprovedOrders.map(po => po.purchaseOrderNumber).join(', ');
                throw new common_1.BadRequestException(`No se puede registrar la recepción porque las siguientes órdenes de compra no han sido aprobadas por Gerencia: ${orderNumbers}. Estado ID: ${unapprovedOrders[0].approvalStatusId}`);
            }
            const previousStatus = requisition.status.code;
            const createdReceipts = [];
            for (const itemDto of dto.items) {
                const poItem = await queryRunner.manager.findOne(purchase_order_item_entity_1.PurchaseOrderItem, {
                    where: { poItemId: itemDto.poItemId },
                    relations: ['purchaseOrder', 'receipts'],
                });
                if (!poItem) {
                    throw new common_1.BadRequestException(`Ítem de orden de compra ${itemDto.poItemId} no encontrado`);
                }
                if (poItem.purchaseOrder.requisitionId !== requisitionId) {
                    throw new common_1.BadRequestException(`El ítem ${itemDto.poItemId} no pertenece a esta requisición`);
                }
                const totalReceived = poItem.receipts?.reduce((sum, receipt) => sum + Number(receipt.quantityReceived), 0) || 0;
                const quantityOrdered = Number(poItem.quantity);
                const quantityPending = quantityOrdered - totalReceived;
                if (itemDto.quantityReceived > quantityPending) {
                    if (!itemDto.overdeliveryJustification) {
                        throw new common_1.BadRequestException(`El ítem ${itemDto.poItemId} tiene una sobreentrega (recibiendo ${itemDto.quantityReceived}, pendiente ${quantityPending}). Debe proporcionar una justificación.`);
                    }
                }
                const receipt = queryRunner.manager.create(material_receipt_entity_1.MaterialReceipt, {
                    poItemId: itemDto.poItemId,
                    quantityReceived: itemDto.quantityReceived,
                    receivedDate: itemDto.receivedDate,
                    observations: itemDto.observations,
                    overdeliveryJustification: itemDto.overdeliveryJustification,
                    createdBy: userId,
                });
                const savedReceipt = await queryRunner.manager.save(receipt);
                createdReceipts.push(savedReceipt);
            }
            const allPOItems = requisition.purchaseOrders?.flatMap((po) => po.items) || [];
            let allItemsComplete = true;
            for (const poItem of allPOItems) {
                const itemWithReceipts = await queryRunner.manager.findOne(purchase_order_item_entity_1.PurchaseOrderItem, {
                    where: { poItemId: poItem.poItemId },
                    relations: ['receipts'],
                });
                if (!itemWithReceipts) {
                    continue;
                }
                const totalReceived = itemWithReceipts.receipts?.reduce((sum, receipt) => sum + Number(receipt.quantityReceived), 0) || 0;
                if (totalReceived < Number(itemWithReceipts.quantity)) {
                    allItemsComplete = false;
                    break;
                }
            }
            let newStatusCode;
            if (allItemsComplete) {
                newStatusCode = 'recepcion_completa';
            }
            else {
                newStatusCode = 'en_recepcion';
            }
            const newStatusId = await this.getStatusIdByCode(newStatusCode);
            await queryRunner.manager.update(requisition_entity_1.Requisition, { requisitionId }, { statusId: newStatusId });
            const log = queryRunner.manager.create(requisition_log_entity_1.RequisitionLog, {
                requisitionId,
                userId,
                action: 'registrar_recepcion',
                previousStatus,
                newStatus: newStatusCode,
                comments: `Recepción registrada para ${dto.items.length} ítem(s)`,
            });
            await queryRunner.manager.save(log);
            await queryRunner.commitTransaction();
            return this.getRequisitionReceipts(requisitionId, userId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async updateMaterialReceipt(requisitionId, receiptId, userId, dto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const receipt = await queryRunner.manager.findOne(material_receipt_entity_1.MaterialReceipt, {
                where: { receiptId },
                relations: ['purchaseOrderItem', 'purchaseOrderItem.purchaseOrder'],
            });
            if (!receipt) {
                throw new common_1.NotFoundException('Recepción no encontrada');
            }
            if (receipt.purchaseOrderItem.purchaseOrder.requisitionId !==
                requisitionId) {
                throw new common_1.BadRequestException('Esta recepción no pertenece a la requisición especificada');
            }
            const requisition = await queryRunner.manager.findOne(requisition_entity_1.Requisition, {
                where: { requisitionId },
            });
            if (!requisition) {
                throw new common_1.NotFoundException('Requisición no encontrada');
            }
            if (requisition.createdBy !== userId) {
                throw new common_1.ForbiddenException('Solo el creador de la requisición puede editar recepciones');
            }
            if (dto.quantityReceived !== undefined) {
                const poItem = receipt.purchaseOrderItem;
                const allReceipts = await queryRunner.manager.find(material_receipt_entity_1.MaterialReceipt, {
                    where: { poItemId: poItem.poItemId },
                });
                const totalOtherReceipts = allReceipts
                    .filter((r) => r.receiptId !== receiptId)
                    .reduce((sum, r) => sum + Number(r.quantityReceived), 0);
                const newTotal = totalOtherReceipts + dto.quantityReceived;
                const quantityOrdered = Number(poItem.quantity);
                if (newTotal > quantityOrdered) {
                    if (!dto.overdeliveryJustification &&
                        !receipt.overdeliveryJustification) {
                        throw new common_1.BadRequestException('La nueva cantidad genera una sobreentrega. Debe proporcionar una justificación.');
                    }
                }
            }
            Object.assign(receipt, dto);
            await queryRunner.manager.save(receipt);
            const allPOItems = await queryRunner.manager
                .createQueryBuilder(purchase_order_item_entity_1.PurchaseOrderItem, 'poItem')
                .leftJoin('poItem.purchaseOrder', 'po')
                .leftJoinAndSelect('poItem.receipts', 'receipts')
                .where('po.requisition_id = :requisitionId', { requisitionId })
                .getMany();
            let allItemsComplete = true;
            for (const poItem of allPOItems) {
                const totalReceived = poItem.receipts?.reduce((sum, r) => sum + Number(r.quantityReceived), 0) || 0;
                if (totalReceived < Number(poItem.quantity)) {
                    allItemsComplete = false;
                    break;
                }
            }
            const newStatusCode = allItemsComplete
                ? 'recepcion_completa'
                : 'en_recepcion';
            const newStatusId = await this.getStatusIdByCode(newStatusCode);
            await queryRunner.manager.update(requisition_entity_1.Requisition, { requisitionId }, { statusId: newStatusId });
            await queryRunner.commitTransaction();
            return queryRunner.manager.findOne(material_receipt_entity_1.MaterialReceipt, {
                where: { receiptId },
                relations: [
                    'purchaseOrderItem',
                    'purchaseOrderItem.requisitionItem',
                    'purchaseOrderItem.requisitionItem.material',
                    'creator',
                ],
            });
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async getPurchaseOrders(userId, page = 1, limit = 10, filters) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters?.requisitionId) {
            where.requisitionId = filters.requisitionId;
        }
        if (filters?.supplierId) {
            where.supplierId = filters.supplierId;
        }
        if (filters?.fromDate && filters?.toDate) {
            where.issueDate = (0, typeorm_2.Between)(new Date(filters.fromDate), new Date(filters.toDate));
        }
        else if (filters?.fromDate) {
            where.issueDate = (0, typeorm_2.Between)(new Date(filters.fromDate), new Date());
        }
        const [purchaseOrders, total] = await this.purchaseOrderRepository.findAndCount({
            where,
            relations: [
                'requisition',
                'requisition.operationCenter',
                'requisition.operationCenter.company',
                'supplier',
                'creator',
                'items',
                'items.requisitionItem',
                'items.requisitionItem.material',
            ],
            order: {
                createdAt: 'DESC',
            },
            take: limit,
            skip,
        });
        return {
            data: purchaseOrders,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getPurchaseOrderById(purchaseOrderId) {
        const purchaseOrder = await this.purchaseOrderRepository.findOne({
            where: { purchaseOrderId },
            relations: [
                'requisition',
                'requisition.operationCenter',
                'requisition.operationCenter.company',
                'requisition.projectCode',
                'requisition.status',
                'supplier',
                'creator',
                'items',
                'items.requisitionItem',
                'items.requisitionItem.material',
                'items.quotation',
                'approvalStatus',
            ],
        });
        if (!purchaseOrder) {
            throw new common_1.NotFoundException(`Orden de compra con ID ${purchaseOrderId} no encontrada`);
        }
        return purchaseOrder;
    }
    async getPurchaseOrdersByRequisition(requisitionId, userId) {
        const requisition = await this.requisitionRepository.findOne({
            where: { requisitionId },
            relations: ['status'],
        });
        if (!requisition) {
            throw new common_1.NotFoundException(`Requisición con ID ${requisitionId} no encontrada`);
        }
        const purchaseOrders = await this.purchaseOrderRepository.find({
            where: { requisitionId },
            relations: [
                'supplier',
                'creator',
                'items',
                'items.requisitionItem',
                'items.requisitionItem.material',
            ],
            order: {
                createdAt: 'DESC',
            },
        });
        return {
            requisition: {
                requisitionId: requisition.requisitionId,
                requisitionNumber: requisition.requisitionNumber,
                status: requisition.status,
            },
            purchaseOrders,
        };
    }
    async getPendingPurchaseOrdersForApproval(userId, page = 1, limit = 10) {
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (user.role.nombreRol !== 'Gerencia') {
            throw new common_1.ForbiddenException('Solo el rol Gerencia puede aprobar órdenes de compra');
        }
        const pendingQueryBuilder = this.purchaseOrderRepository
            .createQueryBuilder('po')
            .leftJoinAndSelect('po.requisition', 'requisition')
            .leftJoinAndSelect('requisition.operationCenter', 'operationCenter')
            .leftJoinAndSelect('operationCenter.company', 'company')
            .leftJoinAndSelect('po.supplier', 'supplier')
            .leftJoinAndSelect('po.creator', 'creator')
            .leftJoinAndSelect('po.items', 'items')
            .leftJoinAndSelect('items.requisitionItem', 'requisitionItem')
            .leftJoinAndSelect('requisitionItem.material', 'material')
            .leftJoinAndSelect('po.approvals', 'approvals')
            .leftJoinAndSelect('approvals.approver', 'approver')
            .leftJoinAndSelect('po.approvalStatus', 'poApprovalStatus');
        const pendingStatusId = await this.getPurchaseOrderStatusId('pendiente_aprobacion_gerencia');
        pendingQueryBuilder
            .where('po.approvalStatusId = :statusId', {
            statusId: pendingStatusId,
        })
            .orderBy('po.createdAt', 'DESC');
        const [pendingOrders, pendingTotal] = await pendingQueryBuilder.getManyAndCount();
        const processedQueryBuilder = this.purchaseOrderRepository
            .createQueryBuilder('po')
            .leftJoinAndSelect('po.requisition', 'requisition')
            .leftJoinAndSelect('requisition.operationCenter', 'operationCenter')
            .leftJoinAndSelect('operationCenter.company', 'company')
            .leftJoinAndSelect('po.supplier', 'supplier')
            .leftJoinAndSelect('po.creator', 'creator')
            .leftJoinAndSelect('po.items', 'items')
            .leftJoinAndSelect('items.requisitionItem', 'requisitionItem')
            .leftJoinAndSelect('requisitionItem.material', 'material')
            .leftJoinAndSelect('po.approvals', 'approvals')
            .leftJoinAndSelect('approvals.approver', 'approver')
            .leftJoinAndSelect('po.approvalStatus', 'poApprovalStatus');
        const approvedStatusId = await this.getPurchaseOrderStatusId('aprobada_gerencia');
        const rejectedStatusId = await this.getPurchaseOrderStatusId('rechazada_gerencia');
        processedQueryBuilder
            .where('po.approvalStatusId IN (:...statusIds)', {
            statusIds: [approvedStatusId, rejectedStatusId],
        })
            .orderBy('po.createdAt', 'DESC')
            .take(20);
        const [processedOrders, processedTotal] = await processedQueryBuilder.getManyAndCount();
        const purchaseOrders = [...pendingOrders, ...processedOrders];
        const total = pendingTotal + processedTotal;
        const purchaseOrdersWithDeadline = purchaseOrders.map((po) => {
            const deadline = (0, business_days_util_1.addBusinessDays)(po.createdAt, 1);
            const isOverdue = new Date() > deadline;
            const daysOverdue = isOverdue
                ? (0, business_days_util_1.calculateBusinessDaysBetween)(deadline, new Date())
                : 0;
            return {
                ...po,
                deadline,
                isOverdue,
                daysOverdue,
            };
        });
        return {
            data: purchaseOrdersWithDeadline,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getPurchaseOrderForApproval(purchaseOrderId, userId) {
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (!user || user.role.nombreRol !== 'Gerencia') {
            throw new common_1.ForbiddenException('Solo el rol Gerencia puede ver órdenes de compra para aprobar');
        }
        const purchaseOrder = await this.purchaseOrderRepository.findOne({
            where: { purchaseOrderId },
            relations: [
                'requisition',
                'requisition.operationCenter',
                'requisition.operationCenter.company',
                'requisition.projectCode',
                'supplier',
                'creator',
                'items',
                'items.requisitionItem',
                'items.requisitionItem.material',
                'items.requisitionItem.material.materialGroup',
                'items.quotation',
                'approvals',
                'approvals.approver',
                'approvalStatus',
            ],
        });
        if (!purchaseOrder) {
            throw new common_1.NotFoundException(`Orden de compra con ID ${purchaseOrderId} no encontrada`);
        }
        const deadline = (0, business_days_util_1.addBusinessDays)(purchaseOrder.createdAt, 1);
        const isOverdue = new Date() > deadline;
        const daysOverdue = isOverdue
            ? (0, business_days_util_1.calculateBusinessDaysBetween)(deadline, new Date())
            : 0;
        return {
            ...purchaseOrder,
            deadline,
            isOverdue,
            daysOverdue,
        };
    }
    async approvePurchaseOrder(purchaseOrderId, userId, dto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const user = await queryRunner.manager.findOne(user_entity_1.User, {
                where: { userId },
                relations: ['role'],
            });
            if (!user || user.role.nombreRol !== 'Gerencia') {
                throw new common_1.ForbiddenException('Solo el rol Gerencia puede aprobar órdenes de compra');
            }
            const purchaseOrder = await queryRunner.manager.findOne(purchase_order_entity_1.PurchaseOrder, {
                where: { purchaseOrderId },
                relations: ['items', 'approvalStatus'],
            });
            if (!purchaseOrder) {
                throw new common_1.NotFoundException('Orden de compra no encontrada');
            }
            const pendingStatusId = await this.getPurchaseOrderStatusId('pendiente_aprobacion_gerencia');
            if (purchaseOrder.approvalStatusId !== pendingStatusId) {
                throw new common_1.BadRequestException(`Esta orden de compra no puede ser aprobada. Estado actual ID: ${purchaseOrder.approvalStatusId}`);
            }
            if (dto.items.length !== purchaseOrder.items.length) {
                throw new common_1.BadRequestException(`Debe proporcionar una decisión para todos los ${purchaseOrder.items.length} ítems de la orden de compra`);
            }
            const allApproved = dto.items.every((item) => item.decision === 'approved');
            const anyRejected = dto.items.some((item) => item.decision === 'rejected');
            if (anyRejected && !dto.rejectionReason) {
                throw new common_1.BadRequestException('Debe proporcionar una razón de rechazo cuando se rechaza algún ítem');
            }
            const deadline = (0, business_days_util_1.addBusinessDays)(purchaseOrder.createdAt, 1);
            const isOverdue = new Date() > deadline;
            const approval = queryRunner.manager.create(purchase_order_approval_entity_1.PurchaseOrderApproval, {
                purchaseOrderId,
                approverId: userId,
                approvalStatus: allApproved ? purchase_order_approval_entity_1.ApprovalStatus.APPROVED : purchase_order_approval_entity_1.ApprovalStatus.REJECTED,
                comments: dto.generalComments || null,
                rejectionReason: dto.rejectionReason || null,
                approvalDate: new Date(),
                deadline,
                isOverdue,
            });
            const savedApproval = await queryRunner.manager.save(approval);
            for (const itemDto of dto.items) {
                const itemApproval = queryRunner.manager.create(purchase_order_item_approval_entity_1.PurchaseOrderItemApproval, {
                    poApprovalId: savedApproval.approvalId,
                    poItemId: itemDto.poItemId,
                    approvalStatus: itemDto.decision === 'approved' ? purchase_order_item_approval_entity_1.ItemApprovalStatus.APPROVED : purchase_order_item_approval_entity_1.ItemApprovalStatus.REJECTED,
                    comments: itemDto.comments || null,
                });
                await queryRunner.manager.save(itemApproval);
            }
            let newStatusId;
            if (allApproved) {
                newStatusId = await this.getPurchaseOrderStatusId('aprobada_gerencia');
            }
            else {
                newStatusId = await this.getPurchaseOrderStatusId('rechazada_gerencia');
                purchaseOrder.rejectionCount = (purchaseOrder.rejectionCount || 0) + 1;
                purchaseOrder.lastRejectionReason = dto.rejectionReason || null;
            }
            await queryRunner.manager.update(purchase_order_entity_1.PurchaseOrder, { purchaseOrderId }, {
                approvalStatusId: newStatusId,
                currentApproverId: userId,
                rejectionCount: allApproved ? purchaseOrder.rejectionCount : (purchaseOrder.rejectionCount || 0) + 1,
                lastRejectionReason: allApproved ? purchaseOrder.lastRejectionReason : (dto.rejectionReason || null),
            });
            if (allApproved) {
                const allPurchaseOrders = await queryRunner.manager.find(purchase_order_entity_1.PurchaseOrder, {
                    where: { requisitionId: purchaseOrder.requisitionId },
                });
                const approvedStatusId = await this.getPurchaseOrderStatusId('aprobada_gerencia');
                const allOrdersApproved = allPurchaseOrders.every((po) => po.approvalStatusId === approvedStatusId);
                if (allOrdersApproved) {
                    const requisition = await queryRunner.manager.findOne(requisition_entity_1.Requisition, {
                        where: { requisitionId: purchaseOrder.requisitionId },
                        relations: ['status'],
                    });
                    if (requisition && requisition.status.code === 'en_orden_compra') {
                        const previousReqStatus = requisition.status.code;
                        const pendingReceptionStatusId = await this.getStatusIdByCode('pendiente_recepcion');
                        await queryRunner.manager.update(requisition_entity_1.Requisition, { requisitionId: requisition.requisitionId }, { statusId: pendingReceptionStatusId });
                        const reqLog = queryRunner.manager.create(requisition_log_entity_1.RequisitionLog, {
                            requisitionId: requisition.requisitionId,
                            userId,
                            action: 'aprobar_todas_ordenes_compra',
                            previousStatus: previousReqStatus,
                            newStatus: 'pendiente_recepcion',
                            comments: 'Todas las órdenes de compra han sido aprobadas por Gerencia',
                        });
                        await queryRunner.manager.save(reqLog);
                    }
                }
            }
            await queryRunner.commitTransaction();
            return this.getPurchaseOrderById(purchaseOrderId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async rejectPurchaseOrder(purchaseOrderId, userId, rejectionReason) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const user = await queryRunner.manager.findOne(user_entity_1.User, {
                where: { userId },
                relations: ['role'],
            });
            if (!user || user.role.nombreRol !== 'Gerencia') {
                throw new common_1.ForbiddenException('Solo el rol Gerencia puede rechazar órdenes de compra');
            }
            const purchaseOrder = await queryRunner.manager.findOne(purchase_order_entity_1.PurchaseOrder, {
                where: { purchaseOrderId },
                relations: ['items', 'approvalStatus'],
            });
            if (!purchaseOrder) {
                throw new common_1.NotFoundException('Orden de compra no encontrada');
            }
            const pendingStatusId = await this.getPurchaseOrderStatusId('pendiente_aprobacion_gerencia');
            if (purchaseOrder.approvalStatusId !== pendingStatusId) {
                throw new common_1.BadRequestException(`Esta orden de compra no puede ser rechazada. Estado actual ID: ${purchaseOrder.approvalStatusId}`);
            }
            if (!rejectionReason || rejectionReason.trim() === '') {
                throw new common_1.BadRequestException('La razón de rechazo es obligatoria');
            }
            const deadline = (0, business_days_util_1.addBusinessDays)(purchaseOrder.createdAt, 1);
            const isOverdue = new Date() > deadline;
            const approval = queryRunner.manager.create(purchase_order_approval_entity_1.PurchaseOrderApproval, {
                purchaseOrderId,
                approverId: userId,
                approvalStatus: purchase_order_approval_entity_1.ApprovalStatus.REJECTED,
                comments: null,
                rejectionReason,
                approvalDate: new Date(),
                deadline,
                isOverdue,
            });
            const savedApproval = await queryRunner.manager.save(approval);
            for (const item of purchaseOrder.items) {
                const itemApproval = queryRunner.manager.create(purchase_order_item_approval_entity_1.PurchaseOrderItemApproval, {
                    poApprovalId: savedApproval.approvalId,
                    poItemId: item.poItemId,
                    approvalStatus: purchase_order_item_approval_entity_1.ItemApprovalStatus.REJECTED,
                    comments: 'Rechazado junto con toda la orden de compra',
                });
                await queryRunner.manager.save(itemApproval);
            }
            const rejectedStatusId = await this.getPurchaseOrderStatusId('rechazada_gerencia');
            purchaseOrder.approvalStatusId = rejectedStatusId;
            purchaseOrder.rejectionCount = (purchaseOrder.rejectionCount || 0) + 1;
            purchaseOrder.lastRejectionReason = rejectionReason;
            purchaseOrder.currentApproverId = userId;
            await queryRunner.manager.save(purchaseOrder);
            await queryRunner.commitTransaction();
            return this.getPurchaseOrderById(purchaseOrderId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async resubmitPurchaseOrder(purchaseOrderId, userId, comments) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const user = await queryRunner.manager.findOne(user_entity_1.User, {
                where: { userId },
                relations: ['role'],
            });
            if (!user || user.role.nombreRol !== 'Compras') {
                throw new common_1.ForbiddenException('Solo el rol Compras puede reenviar órdenes de compra');
            }
            const purchaseOrder = await queryRunner.manager.findOne(purchase_order_entity_1.PurchaseOrder, {
                where: { purchaseOrderId },
                relations: ['approvalStatus'],
            });
            if (!purchaseOrder) {
                throw new common_1.NotFoundException('Orden de compra no encontrada');
            }
            const rejectedStatusId = await this.getPurchaseOrderStatusId('rechazada_gerencia');
            if (purchaseOrder.approvalStatusId !== rejectedStatusId) {
                throw new common_1.BadRequestException('Solo se pueden reenviar órdenes de compra que han sido rechazadas');
            }
            const pendingStatusId = await this.getPurchaseOrderStatusId('pendiente_aprobacion_gerencia');
            purchaseOrder.approvalStatusId = pendingStatusId;
            await queryRunner.manager.save(purchaseOrder);
            await queryRunner.commitTransaction();
            return this.getPurchaseOrderById(purchaseOrderId);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.PurchasesService = PurchasesService;
exports.PurchasesService = PurchasesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(requisition_entity_1.Requisition)),
    __param(1, (0, typeorm_1.InjectRepository)(requisition_item_entity_1.RequisitionItem)),
    __param(2, (0, typeorm_1.InjectRepository)(requisition_log_entity_1.RequisitionLog)),
    __param(3, (0, typeorm_1.InjectRepository)(requisition_status_entity_1.RequisitionStatus)),
    __param(4, (0, typeorm_1.InjectRepository)(requisition_prefix_entity_1.RequisitionPrefix)),
    __param(5, (0, typeorm_1.InjectRepository)(requisition_sequence_entity_1.RequisitionSequence)),
    __param(6, (0, typeorm_1.InjectRepository)(operation_center_entity_1.OperationCenter)),
    __param(7, (0, typeorm_1.InjectRepository)(project_code_entity_1.ProjectCode)),
    __param(8, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(9, (0, typeorm_1.InjectRepository)(authorization_entity_1.Authorization)),
    __param(10, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(11, (0, typeorm_1.InjectRepository)(supplier_entity_1.Supplier)),
    __param(12, (0, typeorm_1.InjectRepository)(requisition_item_quotation_entity_1.RequisitionItemQuotation)),
    __param(13, (0, typeorm_1.InjectRepository)(purchase_order_entity_1.PurchaseOrder)),
    __param(14, (0, typeorm_1.InjectRepository)(purchase_order_item_entity_1.PurchaseOrderItem)),
    __param(15, (0, typeorm_1.InjectRepository)(purchase_order_sequence_entity_1.PurchaseOrderSequence)),
    __param(16, (0, typeorm_1.InjectRepository)(material_receipt_entity_1.MaterialReceipt)),
    __param(17, (0, typeorm_1.InjectRepository)(requisition_item_approval_entity_1.RequisitionItemApproval)),
    __param(18, (0, typeorm_1.InjectRepository)(material_price_history_entity_1.MaterialPriceHistory)),
    __param(19, (0, typeorm_1.InjectRepository)(purchase_order_approval_entity_1.PurchaseOrderApproval)),
    __param(20, (0, typeorm_1.InjectRepository)(purchase_order_item_approval_entity_1.PurchaseOrderItemApproval)),
    __param(21, (0, typeorm_1.InjectRepository)(purchase_order_status_entity_1.PurchaseOrderStatus)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], PurchasesService);
//# sourceMappingURL=purchases.service.js.map