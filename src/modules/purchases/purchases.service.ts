import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, IsNull, In } from 'typeorm';
import { Requisition } from '../../database/entities/requisition.entity';
import { RequisitionItem } from '../../database/entities/requisition-item.entity';
import { RequisitionLog } from '../../database/entities/requisition-log.entity';
import { RequisitionStatus } from '../../database/entities/requisition-status.entity';
import { RequisitionPrefix } from '../../database/entities/requisition-prefix.entity';
import { RequisitionSequence } from '../../database/entities/requisition-sequence.entity';
import { RequisitionItemApproval } from '../../database/entities/requisition-item-approval.entity';
import { OperationCenter } from '../../database/entities/operation-center.entity';
import { ProjectCode } from '../../database/entities/project-code.entity';
import { User } from '../../database/entities/user.entity';
import { Authorization } from '../../database/entities/authorization.entity';
import { Company } from '../../database/entities/company.entity';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import { FilterRequisitionsDto } from './dto/filter-requisitions.dto';
import { ReviewRequisitionDto } from './dto/review-requisition.dto';
import { Supplier } from '../../database/entities/supplier.entity';
import { RequisitionItemQuotation } from '../../database/entities/requisition-item-quotation.entity';
import { ManageQuotationDto } from './dto/manage-quotation.dto';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../database/entities/purchase-order-item.entity';
import { PurchaseOrderSequence } from '../../database/entities/purchase-order-sequence.entity';
import { PurchaseOrderStatus } from '../../database/entities/purchase-order-status.entity';
import { MaterialReceipt } from '../../database/entities/material-receipt.entity';
import { MaterialPriceHistory } from '../../database/entities/material-price-history.entity';
import { PurchaseOrderApproval, ApprovalStatus } from '../../database/entities/purchase-order-approval.entity';
import { PurchaseOrderItemApproval, ItemApprovalStatus } from '../../database/entities/purchase-order-item-approval.entity';
import { calculateSLA, getSLAForStatus, addBusinessDays, calculateBusinessDaysBetween } from '../../utils/business-days.util';
import { CreatePurchaseOrdersDto } from './dto/create-purchase-orders.dto';
import { CreateMaterialReceiptDto } from './dto/create-material-receipt.dto';
import { UpdateMaterialReceiptDto } from './dto/update-material-receipt.dto';
import { ApprovePurchaseOrderDto } from './dto/approve-purchase-order.dto';
import { RolePermission } from '../../database/entities/role-permission.entity';

// Constantes para los IDs de permisos (basado en tabla permisos)
const PERMISO = {
  VER: 1,
  CREAR: 2,
  REVISAR: 3,
  APROBAR: 4,
  AUTORIZAR: 5,
  COTIZAR: 6,
  EXPORTAR: 7,
} as const;

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Requisition)
    private requisitionRepository: Repository<Requisition>,
    @InjectRepository(RequisitionItem)
    private requisitionItemRepository: Repository<RequisitionItem>,
    @InjectRepository(RequisitionLog)
    private requisitionLogRepository: Repository<RequisitionLog>,
    @InjectRepository(RequisitionStatus)
    private requisitionStatusRepository: Repository<RequisitionStatus>,
    @InjectRepository(RequisitionPrefix)
    private requisitionPrefixRepository: Repository<RequisitionPrefix>,
    @InjectRepository(RequisitionSequence)
    private requisitionSequenceRepository: Repository<RequisitionSequence>,
    @InjectRepository(OperationCenter)
    private operationCenterRepository: Repository<OperationCenter>,
    @InjectRepository(ProjectCode)
    private projectCodeRepository: Repository<ProjectCode>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Authorization)
    private authorizationRepository: Repository<Authorization>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(RequisitionItemQuotation)
    private quotationRepository: Repository<RequisitionItemQuotation>,
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(PurchaseOrderSequence)
    private purchaseOrderSequenceRepository: Repository<PurchaseOrderSequence>,
    @InjectRepository(MaterialReceipt)
    private materialReceiptRepository: Repository<MaterialReceipt>,
    @InjectRepository(RequisitionItemApproval)
    private itemApprovalRepository: Repository<RequisitionItemApproval>,
    @InjectRepository(MaterialPriceHistory)
    private materialPriceHistoryRepository: Repository<MaterialPriceHistory>,
    @InjectRepository(PurchaseOrderApproval)
    private purchaseOrderApprovalRepository: Repository<PurchaseOrderApproval>,
    @InjectRepository(PurchaseOrderItemApproval)
    private purchaseOrderItemApprovalRepository: Repository<PurchaseOrderItemApproval>,
    @InjectRepository(PurchaseOrderStatus)
    private purchaseOrderStatusRepository: Repository<PurchaseOrderStatus>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    private dataSource: DataSource,
  ) {}

  // ============================================
  // HELPER: Validar permiso del usuario
  // ============================================
  private async hasPermission(roleId: number, permisoId: number): Promise<boolean> {
    const permission = await this.rolePermissionRepository.findOne({
      where: {
        rolId: roleId,
        permisoId: permisoId,
      },
    });
    return !!permission;
  }

  private async validatePermission(roleId: number, permisoId: number, actionName: string): Promise<void> {
    const hasPermission = await this.hasPermission(roleId, permisoId);
    if (!hasPermission) {
      throw new ForbiddenException(`No tiene permiso para ${actionName}`);
    }
  }

  // ============================================
  // HELPER: Obtener status ID por código
  // ============================================
  private async getStatusIdByCode(code: string): Promise<number> {
    const status = await this.requisitionStatusRepository.findOne({
      where: { code },
    });
    if (!status) {
      throw new Error(`Estado de requisición '${code}' no encontrado`);
    }
    return status.statusId;
  }

  // ============================================
  // HELPER: Obtener purchase order status ID por código (con cache)
  // ============================================
  private async getPurchaseOrderStatusId(code: string): Promise<number> {
    const status = await this.purchaseOrderStatusRepository.findOne({
      where: { code },
      cache: {
        id: `po_status_${code}`,
        milliseconds: 86400000, // 24 horas
      },
    });

    if (!status) {
      throw new BadRequestException(
        `Estado de orden de compra '${code}' no encontrado`
      );
    }

    return status.statusId;
  }

  // ============================================
  // HELPER: Guardar aprobaciones de ítems
  // ============================================
  private async saveItemApprovals(
    requisitionId: number,
    userId: number,
    approvalLevel: 'reviewer' | 'management',
    itemDecisions: Array<{ itemId: number; decision: 'approve' | 'reject'; comments?: string }>,
    queryRunner: any,
  ): Promise<void> {
    if (!itemDecisions || itemDecisions.length === 0) {
      return;
    }

    // Obtener los ítems de la requisición
    const items = await queryRunner.manager.find(RequisitionItem, {
      where: { requisitionId },
      relations: ['material'],
    });

    for (const decision of itemDecisions) {
      const item = items.find(i => i.itemId === decision.itemId);
      if (!item) {
        continue; // Skip if item not found
      }

      // Verificar si ya existe una aprobación para este ítem en este nivel
      const existing = await queryRunner.manager.findOne(RequisitionItemApproval, {
        where: {
          requisitionId,
          itemNumber: item.itemNumber,
          materialId: item.materialId,
          approvalLevel,
        },
      });

      if (existing) {
        // Actualizar la existente
        await queryRunner.manager.update(
          RequisitionItemApproval,
          { itemApprovalId: existing.itemApprovalId },
          {
            requisitionItemId: item.itemId,
            quantity: item.quantity,
            observation: item.observation,
            userId,
            status: decision.decision === 'approve' ? 'approved' : 'rejected',
            comments: decision.comments,
            isValid: true,
          },
        );
      } else {
        // Crear nueva aprobación
        const approval = queryRunner.manager.create(RequisitionItemApproval, {
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

        await queryRunner.manager.save(RequisitionItemApproval, approval);
      }
    }
  }

  // ============================================
  // HELPER: Obtener aprobaciones de ítems
  // ============================================
  async getItemApprovals(
    requisitionId: number,
    approvalLevel?: 'reviewer' | 'management',
  ): Promise<any[]> {
    const where: any = {
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

  // ============================================
  // HELPER: Invalidar aprobaciones cuando se modifica un ítem
  // ============================================
  private async invalidateItemApprovals(
    requisitionId: number,
    modifiedItemIds: number[],
    queryRunner: any,
  ): Promise<void> {
    if (modifiedItemIds.length === 0) {
      return;
    }

    // Marcar como inválidas las aprobaciones de los ítems modificados
    await queryRunner.manager.update(
      RequisitionItemApproval,
      {
        requisitionId,
        requisitionItemId: In(modifiedItemIds),
        isValid: true,
      },
      { isValid: false },
    );
  }

  // ============================================
  // HELPER: Invalidar aprobaciones por itemNumber y materialId
  // ============================================
  private async invalidateItemApprovalsByContent(
    requisitionId: number,
    itemsToInvalidate: Array<{ itemNumber: number; materialId: number }>,
    queryRunner: any,
  ): Promise<void> {
    if (itemsToInvalidate.length === 0) {
      return;
    }

    // Invalidar cada ítem individualmente
    for (const item of itemsToInvalidate) {
      await queryRunner.manager.update(
        RequisitionItemApproval,
        {
          requisitionId,
          itemNumber: item.itemNumber,
          materialId: item.materialId,
          isValid: true,
        },
        { isValid: false },
      );
    }
  }

  // ============================================
  // HELPER: Determinar si requiere autorización de Gerencia de Proyectos
  // ============================================
  private async requiresProjectManagementAuthorization(
    requisition: Requisition,
  ): Promise<boolean> {
    // 1. Obtener información de la empresa
    const company = await this.companyRepository.findOne({
      where: { companyId: requisition.companyId },
    });

    if (!company) {
      return false;
    }

    // 2. Si es una UTAP (Unión Temporal) → requiere autorización
    const isCanalesContactos = company.name.includes('Canales & Contactos');
    if (!isCanalesContactos) {
      // Es una UTAP, requiere autorización de Gerencia de Proyectos
      return true;
    }

    // 3. Si es Canales & Contactos, verificar el proyecto
    if (requisition.projectId) {
      const project = await this.dataSource
        .getRepository('Project')
        .findOne({
          where: { projectId: requisition.projectId },
        });

      if (!project) {
        return false;
      }

      // Solo "Oficina Principal" NO requiere autorización
      // Todos los demás proyectos de Canales & Contactos SÍ requieren autorización
      const isOficinaPrincipal = project.name.toLowerCase().includes('oficina principal');

      // Si es Oficina Principal, NO requiere autorización
      // Si es cualquier otro proyecto, SÍ requiere autorización
      return !isOficinaPrincipal;
    }

    // Si es Canales & Contactos sin proyecto, no requiere autorización
    return false;
  }

  // ============================================
  // MÉTODOS CRUD BÁSICOS
  // ============================================

  async createRequisition(userId: number, dto: CreateRequisitionDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar que el usuario puede crear requisiciones
      const user = await this.userRepository.findOne({
        where: { userId },
        relations: ['role'],
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      await this.validateUserCanCreate(user);

      // 2. Validar empresa
      const company = await this.companyRepository.findOne({
        where: { companyId: dto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Empresa no encontrada');
      }

      // 3. Validar que si es Canales & Contactos, projectId es requerido
      if (company.name.includes('Canales & Contactos') && !dto.projectId) {
        throw new BadRequestException(
          'El proyecto es requerido para Canales & Contactos',
        );
      }

      // 4. Determinar centro de operación automáticamente
      const operationCenterId = await this.determineOperationCenter(
        dto.companyId,
        dto.projectId,
      );

      // 5. Determinar código de proyecto automáticamente
      const projectCodeId = await this.determineProjectCode(
        dto.companyId,
        dto.projectId,
      );

      // 6. Generar número de requisición
      const requisitionNumber = await this.generateRequisitionNumber(
        dto.companyId,
        dto.projectId,
        queryRunner,
      );

      // 7. Crear requisición
      const pendingStatusId = await this.getStatusIdByCode('pendiente');
      const requisition = queryRunner.manager.create(Requisition, {
        requisitionNumber,
        companyId: dto.companyId,
        projectId: dto.projectId,
        operationCenterId,
        projectCodeId: projectCodeId || undefined,
        createdBy: userId,
        statusId: pendingStatusId,
        obra: dto.obra,
        codigoObra: dto.codigoObra,
      });

      const savedRequisition = await queryRunner.manager.save(requisition);

      // 8. Crear ítems
      const items = dto.items.map((item, index) =>
        queryRunner.manager.create(RequisitionItem, {
          requisitionId: savedRequisition.requisitionId,
          itemNumber: index + 1,
          materialId: item.materialId,
          quantity: item.quantity,
          observation: item.observation,
        }),
      );

      await queryRunner.manager.save(RequisitionItem, items);

      // 9. Registrar log
      const log = queryRunner.manager.create(RequisitionLog, {
        requisitionId: savedRequisition.requisitionId,
        userId,
        action: 'crear_requisicion',
        previousStatus: undefined,
        newStatus: 'pendiente',
        comments: `Requisición creada: ${requisitionNumber}`,
      });

      await queryRunner.manager.save(log);

      await queryRunner.commitTransaction();

      // 10. Retornar requisición completa
      return this.getRequisitionById(savedRequisition.requisitionId, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Mejorar mensaje de error para problemas de foreign key
      if (error.code === '23503') {
        const detail = error.detail || '';
        throw new BadRequestException(
          `Error de referencia en base de datos: ${detail}. Verifica que companyId, projectId, materialIds existan en la base de datos.`,
        );
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyRequisitions(userId: number, filters: FilterRequisitionsDto) {
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

    // Filtros opcionales
    if (status) {
      queryBuilder.andWhere('requisitionStatus.code = :status', { status });
    }

    if (projectId) {
      queryBuilder.andWhere('requisition.projectId = :projectId', {
        projectId,
      });
    }

    if (fromDate && toDate) {
      queryBuilder.andWhere(
        'requisition.createdAt BETWEEN :fromDate AND :toDate',
        {
          fromDate: new Date(fromDate),
          toDate: new Date(toDate),
        },
      );
    }

    // Paginación
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

  async getRequisitionById(requisitionId: number, userId: number) {
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
      throw new NotFoundException('Requisición no encontrada');
    }

    // Validar que el usuario tiene permiso para ver esta requisición
    // (creador o autorizador en la cadena)
    const canView = await this.canViewRequisition(requisition, userId);
    if (!canView) {
      throw new ForbiddenException(
        'No tiene permiso para ver esta requisición',
      );
    }

    return requisition;
  }

  async updateRequisition(
    requisitionId: number,
    userId: number,
    dto: UpdateRequisitionDto,
  ) {
    const requisition = await this.requisitionRepository.findOne({
      where: { requisitionId },
      relations: ['items', 'status'],
    });

    if (!requisition) {
      throw new NotFoundException('Requisición no encontrada');
    }

    // Validar que el usuario es el creador
    if (requisition.createdBy !== userId) {
      throw new ForbiddenException(
        'Solo el creador puede modificar la requisición',
      );
    }

    // Validar que el estado permite edición
    const editableStatuses = [
      'pendiente',
      'rechazada_revisor',
      'rechazada_gerencia',
    ];
    if (!editableStatuses.includes(requisition.status.code)) {
      throw new BadRequestException(
        'Esta requisición ya no puede ser modificada',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const previousStatus = requisition.status.code;

      // Actualizar campos de la requisición
      if (dto.companyId) {
        requisition.companyId = dto.companyId;
        // Recalcular centro de operación y código de proyecto
        requisition.operationCenterId = await this.determineOperationCenter(
          dto.companyId,
          dto.projectId,
        );
        const projectCodeId = await this.determineProjectCode(
          dto.companyId,
          dto.projectId,
        );
        if (projectCodeId !== undefined) {
          requisition.projectCodeId = projectCodeId;
        }
      }

      if (dto.projectId !== undefined) {
        requisition.projectId = dto.projectId;
      }

      // Si estaba rechazada, volver al estado apropiado según quién rechazó
      let newStatusCode = previousStatus;
      if (previousStatus === 'rechazada_revisor' || previousStatus === 'rechazada_gerencia') {
        // Si fue rechazada (por revisor o gerencia), vuelve a pendiente para que el revisor la vea nuevamente
        const pendingStatusId = await this.getStatusIdByCode('pendiente');
        requisition.statusId = pendingStatusId;
        // Eliminar la relación status para evitar conflictos con TypeORM
        (requisition as any).status = undefined;
        newStatusCode = 'pendiente';
      }

      await queryRunner.manager.save(Requisition, requisition);

      // Actualizar ítems si se proporcionan
      if (dto.items) {
        // Guardar ítems viejos para comparar
        const oldItems = await queryRunner.manager.find(RequisitionItem, {
          where: { requisitionId },
          order: { itemNumber: 'ASC' },
        });

        // Crear un mapa de ítems viejos por itemNumber
        const oldItemsMap = new Map(
          oldItems.map((item) => [item.itemNumber, item]),
        );

        // Detectar ítems que cambiaron (material, cantidad u observación diferentes)
        const itemsToInvalidate: Array<{ itemNumber: number; materialId: number }> = [];

        dto.items.forEach((newItem, index) => {
          const itemNumber = index + 1;
          const oldItem = oldItemsMap.get(itemNumber);

          if (oldItem) {
            // El ítem existía en la misma posición
            const materialChanged = oldItem.materialId !== newItem.materialId;
            const quantityChanged = parseFloat(oldItem.quantity.toString()) !== newItem.quantity;
            const observationChanged = (oldItem.observation || '') !== (newItem.observation || '');

            if (materialChanged || quantityChanged || observationChanged) {
              // El ítem cambió, invalidar aprobaciones del ítem viejo
              itemsToInvalidate.push({
                itemNumber: oldItem.itemNumber,
                materialId: oldItem.materialId,
              });
            }
          }
          // Si el ítem no existía (es nuevo), no hay aprobaciones que invalidar
        });

        // Verificar ítems que fueron eliminados (existían pero ya no)
        oldItems.forEach((oldItem) => {
          if (dto.items && oldItem.itemNumber > dto.items.length) {
            // Este ítem fue eliminado
            itemsToInvalidate.push({
              itemNumber: oldItem.itemNumber,
              materialId: oldItem.materialId,
            });
          }
        });

        // Invalidar aprobaciones de ítems modificados o eliminados
        await this.invalidateItemApprovalsByContent(
          requisitionId,
          itemsToInvalidate,
          queryRunner,
        );

        // Eliminar ítems existentes
        await queryRunner.manager.delete(RequisitionItem, {
          requisitionId,
        });

        // Crear nuevos ítems
        const items = dto.items.map((item, index) =>
          queryRunner.manager.create(RequisitionItem, {
            requisitionId,
            itemNumber: index + 1,
            materialId: item.materialId,
            quantity: item.quantity,
            observation: item.observation,
          }),
        );

        await queryRunner.manager.save(RequisitionItem, items);
      }

      // Registrar log
      let logAction = 'editar_requisicion';
      let logComments = 'Requisición actualizada';

      if (previousStatus === 'rechazada_revisor' || previousStatus === 'rechazada_gerencia') {
        logAction = 'reenviar_requisicion';
        logComments = `Requisición corregida y reenviada después de ser rechazada`;
      }

      const log = queryRunner.manager.create(RequisitionLog, {
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteRequisition(requisitionId: number, userId: number) {
    const requisition = await this.requisitionRepository.findOne({
      where: { requisitionId },
      relations: ['status'],
    });

    if (!requisition) {
      throw new NotFoundException('Requisición no encontrada');
    }

    // Validar que el usuario es el creador
    if (requisition.createdBy !== userId) {
      throw new ForbiddenException(
        'Solo el creador puede eliminar la requisición',
      );
    }

    // Validar que está en estado pendiente
    if (requisition.status.code !== 'pendiente') {
      throw new BadRequestException(
        'Solo se pueden eliminar requisiciones en estado pendiente',
      );
    }

    await this.requisitionRepository.remove(requisition);

    return { message: 'Requisición eliminada exitosamente' };
  }

  // ============================================
  // MÉTODOS DE AUTORIZACIONES
  // ============================================

  async getPendingActions(userId: number, filters: FilterRequisitionsDto) {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Obtener subordinados
    const authorizations = await this.authorizationRepository.find({
      where: {
        usuarioAutorizadorId: userId,
        esActivo: true,
      },
      relations: ['usuarioAutorizado'],
    });

    const subordinateIds = authorizations.map(
      (auth) => auth.usuarioAutorizadoId,
    );

    const page = filters.page || 1;
    const limit = filters.limit || 10;

    // Determinar estados según rol
    const roleName = user.role.nombreRol;

    // Validación temprana para roles que REQUIEREN subordinados
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
      // Join with approvals to get action dates
      .leftJoinAndSelect('requisition.approvals', 'approvals')
      .leftJoinAndSelect('approvals.user', 'approvalUser')
      .leftJoinAndSelect('approvals.newStatus', 'approvalNewStatus');

    if (roleName === 'Gerencia') {
      // Gerencia ve TODAS las requisiciones que pasaron por revisión (incluyendo autorizadas) + pendientes de subordinados
      if (subordinateIds.length > 0) {
        queryBuilder.where(
          `(requisitionStatus.code IN ('aprobada_revisor', 'autorizado', 'aprobada_gerencia', 'rechazada_gerencia', 'cotizada', 'en_orden_compra', 'pendiente_recepcion')) OR
           (requisitionStatus.code = 'pendiente' AND requisition.createdBy IN (:...subordinateIds))`,
          { subordinateIds },
        );
      } else {
        // Si no tiene subordinados directos, ve todas las requisiciones que pasaron por revisión
        queryBuilder.where('requisitionStatus.code IN (:...statuses)', {
          statuses: ['aprobada_revisor', 'autorizado', 'aprobada_gerencia', 'rechazada_gerencia', 'cotizada', 'en_orden_compra', 'pendiente_recepcion'],
        });
      }
    } else if (roleName.includes('Director')) {
      // Directores ven TODAS las requisiciones de subordinados directos
      queryBuilder.where('requisition.createdBy IN (:...subordinateIds)', {
        subordinateIds,
      });
    } else if (roleName === 'Compras') {
      // Compras ve TODAS las requisiciones aprobadas por gerencia o en proceso de compras
      queryBuilder.where('requisitionStatus.code IN (:...statuses)', {
        statuses: ['aprobada_gerencia', 'cotizada', 'en_orden_compra', 'pendiente_recepcion'],
      });
    }

    // Ordenar por fecha de creación
    queryBuilder.orderBy('requisition.createdAt', 'DESC');

    const [allRequisitions, total] = await queryBuilder.getManyAndCount();

    // Separar en pendientes y procesadas según el rol
    const pending: any[] = [];
    const processed: any[] = [];

    for (const req of allRequisitions) {
      let isPending = false;
      let lastActionDate = req.updatedAt || req.createdAt;
      let lastActionLabel = 'Creada';

      if (roleName.includes('Director')) {
        // Pendiente si está en estado pendiente o en_revision
        isPending = ['pendiente', 'en_revision'].includes(req.status.code);

        // Si está procesada, buscar fecha de aprobación/rechazo por revisor
        if (!isPending) {
          const approval = req.approvals?.find(a =>
            ['aprobada_revisor', 'rechazada_revisor'].includes(a.newStatus?.code)
          );
          if (approval) {
            lastActionDate = approval.createdAt;
            lastActionLabel = approval.newStatus.code === 'aprobada_revisor' ? 'Aprobada' : 'Rechazada';
          } else {
            // Si no hay approval pero el estado indica que fue procesada, usar el estado actual
            if (req.status.code === 'aprobada_revisor') {
              lastActionLabel = 'Aprobada por revisor';
            } else if (req.status.code === 'rechazada_revisor') {
              lastActionLabel = 'Rechazada por revisor';
            } else if (req.status.code === 'aprobada_gerencia') {
              lastActionLabel = 'Aprobada por gerencia';
            } else if (req.status.code === 'rechazada_gerencia') {
              lastActionLabel = 'Rechazada por gerencia';
            }
          }
        }
      } else if (roleName === 'Gerencia') {
        // Pendiente si está aprobada por revisor, autorizada por Gerencia de Proyectos, o pendiente de subordinado
        isPending = req.status.code === 'aprobada_revisor' ||
                   req.status.code === 'autorizado' ||
                   (req.status.code === 'pendiente' && subordinateIds.includes(req.createdBy));

        // Si está procesada, buscar fecha de aprobación/rechazo por gerencia
        if (!isPending) {
          const approval = req.approvals?.find(a =>
            ['aprobada_gerencia', 'rechazada_gerencia'].includes(a.newStatus?.code)
          );
          if (approval) {
            lastActionDate = approval.createdAt;
            lastActionLabel = approval.newStatus.code === 'aprobada_gerencia' ? 'Aprobada' : 'Rechazada';
          } else {
            // Si no hay approval pero el estado indica que fue procesada, usar el estado actual
            if (req.status.code === 'aprobada_gerencia') {
              lastActionLabel = 'Aprobada por gerencia';
            } else if (req.status.code === 'rechazada_gerencia') {
              lastActionLabel = 'Rechazada por gerencia';
            } else if (req.status.code === 'cotizada') {
              lastActionLabel = 'Cotizada';
            } else if (req.status.code === 'en_orden_compra') {
              lastActionLabel = 'En orden de compra';
            }
          }
        }
      } else if (roleName === 'Compras') {
        // Pendiente si está aprobada por gerencia (esperando cotización/orden)
        isPending = req.status.code === 'aprobada_gerencia';

        // Si está procesada, buscar fecha de cotización u orden
        if (!isPending) {
          const approval = req.approvals?.find(a =>
            ['cotizada', 'en_orden_compra'].includes(a.newStatus?.code)
          );
          if (approval) {
            lastActionDate = approval.createdAt;
            lastActionLabel = approval.newStatus.code === 'cotizada' ? 'Cotizada' :
                            approval.newStatus.code === 'en_orden_compra' ? 'En Orden de Compra' : 'Procesada';
          } else {
            // Si no hay approval pero el estado indica que fue procesada, usar el estado actual
            if (req.status.code === 'cotizada') {
              lastActionLabel = 'Cotizada';
            } else if (req.status.code === 'en_orden_compra') {
              lastActionLabel = 'En orden de compra';
            } else if (req.status.code === 'pendiente_recepcion') {
              lastActionLabel = 'Pendiente de recepción';
            }
          }
        }
      }

      // Calcular SLA
      const slaBusinessDays = getSLAForStatus(req.status.code);
      let slaDeadline: Date | null = null;
      let isOverdue = false;
      let daysOverdue = 0;

      if (slaBusinessDays > 0) {
        // La fecha de inicio para el SLA es cuando la requisición entró al estado actual
        // Buscar el approval que cambió al estado actual
        const statusChangeApproval = req.approvals?.find(a =>
          a.newStatus?.code === req.status.code
        );

        const slaStartDate = statusChangeApproval?.createdAt || req.createdAt;
        const slaResult = calculateSLA(slaStartDate, slaBusinessDays);

        slaDeadline = slaResult.deadline;
        isOverdue = slaResult.isOverdue;
        daysOverdue = slaResult.daysOverdue;
      }

      // Agregar metadata al objeto
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
      } else {
        processed.push(reqWithMeta);
      }
    }

    // Ordenar: pendientes primero (más antiguas primero), luego procesadas (más recientes primero)
    pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    processed.sort((a, b) => new Date(b.lastActionDate).getTime() - new Date(a.lastActionDate).getTime());

    // Combinar: pendientes primero, luego procesadas
    const sortedRequisitions = [...pending, ...processed];

    // Aplicar paginación
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

  async reviewRequisition(
    requisitionId: number,
    userId: number,
    dto: ReviewRequisitionDto,
  ) {
    // Validar permiso de revisar
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.validatePermission(user.role.rolId, PERMISO.REVISAR, 'revisar requisiciones');

    const requisition = await this.requisitionRepository.findOne({
      where: { requisitionId },
      relations: ['creator', 'status'],
    });

    if (!requisition) {
      throw new NotFoundException('Requisición no encontrada');
    }

    // Validar que el usuario es autorizador del creador
    const isAuthorizer = await this.isAuthorizer(userId, requisition.createdBy);

    if (!isAuthorizer) {
      throw new ForbiddenException(
        'No tiene permiso para revisar esta requisición',
      );
    }

    // Validar estado actual
    if (
      requisition.status.code !== 'pendiente' &&
      requisition.status.code !== 'en_revision'
    ) {
      throw new BadRequestException(
        'Esta requisición no puede ser revisada en su estado actual',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const previousStatus = requisition.status.code;
      let newStatusCode: string;
      let action: string;

      if (dto.decision === 'approve') {
        // Verificar si requiere autorización de Gerencia de Proyectos
        const requiresAuth = await this.requiresProjectManagementAuthorization(requisition);

        if (requiresAuth) {
          // Si requiere autorización, cambiar a "pendiente de autorización"
          newStatusCode = 'pendiente_autorizacion';
          action = 'revisar_aprobar_pendiente_autorizacion';
        } else {
          // Si NO requiere autorización, cambiar a "aprobada por revisor"
          newStatusCode = 'aprobada_revisor';
          action = 'revisar_aprobar';
        }
      } else {
        // Rechazar
        newStatusCode = 'rechazada_revisor';
        action = 'revisar_rechazar';
      }

      const newStatusId = await this.getStatusIdByCode(newStatusCode);

      // Actualizar la requisición con el nuevo estado
      await queryRunner.manager.update(Requisition, requisitionId, {
        statusId: newStatusId,
        reviewedBy: userId,
        reviewedAt: new Date(),
      });

      // Registrar log
      const log = queryRunner.manager.create(RequisitionLog, {
        requisitionId,
        userId,
        action,
        previousStatus,
        newStatus: newStatusCode,
        comments:
          dto.comments ||
          `Requisición ${dto.decision === 'approve' ? 'aprobada' : 'rechazada'} por revisor`,
      });

      await queryRunner.manager.save(log);

      // Guardar aprobaciones de ítems si se proporcionaron
      if (dto.itemDecisions && dto.itemDecisions.length > 0) {
        await this.saveItemApprovals(
          requisitionId,
          userId,
          'reviewer',
          dto.itemDecisions,
          queryRunner,
        );
      }

      await queryRunner.commitTransaction();

      return this.getRequisitionById(requisitionId, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================
  // AUTORIZAR REQUISICIÓN (Gerencia de Proyectos)
  // ============================================
  async authorizeRequisition(
    requisitionId: number,
    userId: number,
    dto: { decision: 'authorize' | 'reject'; comments?: string },
  ) {
    // Validar permiso de autorizar
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.validatePermission(user.role.rolId, PERMISO.AUTORIZAR, 'autorizar requisiciones');

    const requisition = await this.requisitionRepository.findOne({
      where: { requisitionId },
      relations: ['status'],
    });

    if (!requisition) {
      throw new NotFoundException('Requisición no encontrada');
    }

    // Validar estado actual: debe estar en "pendiente_autorizacion"
    if (requisition.status.code !== 'pendiente_autorizacion') {
      throw new BadRequestException(
        `Esta requisición no puede ser autorizada en su estado actual: ${requisition.status.code}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const previousStatus = requisition.status.code;
      let newStatusCode: string;
      let action: string;

      if (dto.decision === 'authorize') {
        // Autorizar: cambiar a "autorizado"
        newStatusCode = 'autorizado';
        action = 'autorizar_aprobar';
      } else {
        // Rechazar: devolver a "rechazada_revisor" para que el creador corrija
        newStatusCode = 'rechazada_revisor';
        action = 'autorizar_rechazar';
      }

      const newStatusId = await this.getStatusIdByCode(newStatusCode);

      // Actualizar la requisición con el nuevo estado
      await queryRunner.manager.update(Requisition, requisitionId, {
        statusId: newStatusId,
      });

      // Registrar log
      const log = queryRunner.manager.create(RequisitionLog, {
        requisitionId,
        userId,
        action,
        previousStatus,
        newStatus: newStatusCode,
        comments:
          dto.comments ||
          `Requisición ${dto.decision === 'authorize' ? 'autorizada' : 'rechazada'} por Gerencia de Proyectos`,
      });

      await queryRunner.manager.save(log);

      await queryRunner.commitTransaction();

      return this.getRequisitionById(requisitionId, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async approveRequisition(
    requisitionId: number,
    userId: number,
    dto: { comments?: string; itemDecisions?: Array<{ itemId: number; decision: 'approve' | 'reject'; comments?: string }> },
  ) {
    // Validar permiso de aprobar
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.validatePermission(user.role.rolId, PERMISO.APROBAR, 'aprobar requisiciones');

    const requisition = await this.requisitionRepository.findOne({
      where: { requisitionId },
      relations: ['status'],
    });

    if (!requisition) {
      throw new NotFoundException('Requisición no encontrada');
    }

    // Validar estado actual: acepta 'pendiente' (para Directores de Área/Técnico),
    // 'aprobada_revisor' (para roles que pasaron por revisor),
    // o 'autorizado' (para requisiciones que pasaron por autorización de Gerencia de Proyectos)
    const validStatuses = ['pendiente', 'aprobada_revisor', 'autorizado'];
    if (!validStatuses.includes(requisition.status.code)) {
      throw new BadRequestException(
        `Esta requisición no puede ser aprobada en su estado actual: ${requisition.status.code}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const previousStatus = requisition.status.code;
      const approvedStatusId = await this.getStatusIdByCode('aprobada_gerencia');

      // Actualizar la requisición con el nuevo estado
      await queryRunner.manager.update(Requisition, requisitionId, {
        statusId: approvedStatusId,
        approvedBy: userId,
        approvedAt: new Date(),
      });

      // Registrar log
      const log = queryRunner.manager.create(RequisitionLog, {
        requisitionId,
        userId,
        action: 'aprobar_gerencia',
        previousStatus,
        newStatus: 'aprobada_gerencia',
        comments: dto.comments || 'Requisición aprobada por gerencia',
      });

      await queryRunner.manager.save(log);

      // Guardar aprobaciones de ítems si se proporcionaron
      if (dto.itemDecisions && dto.itemDecisions.length > 0) {
        await this.saveItemApprovals(
          requisitionId,
          userId,
          'management',
          dto.itemDecisions,
          queryRunner,
        );
      }

      await queryRunner.commitTransaction();

      return this.getRequisitionById(requisitionId, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async rejectRequisitionByManager(
    requisitionId: number,
    userId: number,
    dto: { comments: string },
  ) {
    const requisition = await this.requisitionRepository.findOne({
      where: { requisitionId },
      relations: ['status'],
    });

    if (!requisition) {
      throw new NotFoundException('Requisición no encontrada');
    }

    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    // Validar que el usuario es Gerencia
    if (user?.role.nombreRol !== 'Gerencia') {
      throw new ForbiddenException(
        'Solo Gerencia puede rechazar requisiciones',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const previousStatus = requisition.status.code;
      const rejectedStatusId = await this.getStatusIdByCode('rechazada_gerencia');

      // Actualizar la requisición con el nuevo estado
      await queryRunner.manager.update(Requisition, requisitionId, {
        statusId: rejectedStatusId,
      });

      // Registrar log
      const log = queryRunner.manager.create(RequisitionLog, {
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  private async generateRequisitionNumber(
    companyId: number,
    projectId: number | undefined,
    queryRunner: any,
  ): Promise<string> {
    // Buscar el prefijo correspondiente
    // Si projectId es undefined o null, buscar prefijos sin proyecto
    const prefix = await this.requisitionPrefixRepository.findOne({
      where: {
        companyId,
        projectId: projectId !== undefined ? projectId : IsNull(),
      },
    });

    if (!prefix) {
      throw new NotFoundException(
        `No se encontró prefijo para companyId=${companyId}, projectId=${projectId}. Verifica que exista un prefijo configurado para esta combinación.`,
      );
    }

    // Obtener y actualizar secuencia (con lock)
    const sequence = await queryRunner.manager.findOne(RequisitionSequence, {
      where: { prefixId: prefix.prefixId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!sequence) {
      throw new NotFoundException('Secuencia no encontrada');
    }

    sequence.lastNumber += 1;
    await queryRunner.manager.save(sequence);

    // Formatear número
    const formattedNumber = String(sequence.lastNumber).padStart(3, '0');
    return `${prefix.prefix}-${formattedNumber}`;
  }

  private async determineOperationCenter(
    companyId: number,
    projectId?: number,
  ): Promise<number> {
    const operationCenter = await this.operationCenterRepository.findOne({
      where: {
        companyId,
        projectId: projectId !== undefined ? projectId : IsNull(),
      },
    });

    if (!operationCenter) {
      throw new NotFoundException(
        `Centro de operación no encontrado para companyId=${companyId}, projectId=${projectId}`,
      );
    }

    return operationCenter.centerId;
  }

  private async determineProjectCode(
    companyId: number,
    projectId?: number,
  ): Promise<number | undefined> {
    const projectCode = await this.projectCodeRepository.findOne({
      where: {
        companyId,
        projectId: projectId !== undefined ? projectId : IsNull(),
      },
    });

    return projectCode?.codeId;
  }

  private async validateUserCanCreate(user: User): Promise<void> {
    // Validar permiso de crear usando la tabla roles_permisos
    await this.validatePermission(user.role.rolId, PERMISO.CREAR, 'crear requisiciones');
  }

  private async isAuthorizer(
    autorizadorId: number,
    autorizadoId: number,
  ): Promise<boolean> {
    const authorization = await this.authorizationRepository.findOne({
      where: {
        usuarioAutorizadorId: autorizadorId,
        usuarioAutorizadoId: autorizadoId,
        esActivo: true,
      },
    });

    return !!authorization;
  }

  private async canViewRequisition(
    requisition: Requisition,
    userId: number,
  ): Promise<boolean> {
    // El creador siempre puede ver
    if (requisition.createdBy === userId) {
      return true;
    }

    // Verificar si es autorizador directo
    const isAuthorizer = await this.isAuthorizer(userId, requisition.createdBy);
    if (isAuthorizer) {
      return true;
    }

    // Obtener el usuario y su rol
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      return false;
    }

    // Cargar el status si no está cargado
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

    // Gerencia de Proyectos puede ver requisiciones pendientes de autorización y autorizadas
    if (user.role.nombreRol === 'Gerencia de Proyectos') {
      if (
        status?.code === 'pendiente_autorizacion' ||
        status?.code === 'autorizado'
      ) {
        return true;
      }
    }

    // Gerencia puede ver requisiciones aprobadas por revisor, autorizadas, y las que ellos han procesado
    if (user.role.nombreRol === 'Gerencia') {
      if (
        status?.code === 'aprobada_revisor' ||
        status?.code === 'pendiente' ||
        status?.code === 'autorizado' ||
        status?.code === 'aprobada_gerencia' ||
        status?.code === 'rechazada_gerencia'
      ) {
        return true;
      }
    }

    return false;
  }

  // ============================================
  // MÉTODOS DE COTIZACIÓN
  // ============================================

  /**
   * Lista todas las requisiciones aprobadas por gerencia (estado = 'aprobada_gerencia')
   * listas para asignar cotizaciones.
   */
  async getRequisitionsForQuotation(userId: number, filters: FilterRequisitionsDto) {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que el usuario es del rol Compras
    if (user.role.nombreRol !== 'Compras') {
      throw new ForbiddenException(
        'Solo el rol Compras puede gestionar cotizaciones',
      );
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
      // Join with approvals to calculate SLA deadlines
      .leftJoinAndSelect('requisition.approvals', 'approvals')
      .leftJoinAndSelect('approvals.user', 'approvalUser')
      .leftJoinAndSelect('approvals.newStatus', 'approvalNewStatus');

    // Query 1: Obtener TODAS las requisiciones pendientes de cotización (sin límite)
    const pendingQueryBuilder = queryBuilder.clone()
      .where('requisitionStatus.code IN (:...statuses)', {
        statuses: ['aprobada_gerencia', 'en_cotizacion']
      })
      .orderBy('requisition.createdAt', 'DESC');

    const [pendingRequisitions, pendingTotal] = await pendingQueryBuilder.getManyAndCount();

    // Query 2: Obtener últimas 20 requisiciones procesadas (cotizadas y posteriores)
    const processedQueryBuilder = queryBuilder.clone()
      .where('requisitionStatus.code IN (:...statuses)', {
        statuses: ['cotizada', 'en_orden_compra', 'pendiente_recepcion', 'en_recepcion', 'recepcion_completa']
      })
      .orderBy('requisition.createdAt', 'DESC')
      .take(20); // Limitar a 20 procesadas

    const [processedRequisitions, processedTotal] = await processedQueryBuilder.getManyAndCount();

    // Combinar resultados: pendientes primero, luego procesadas
    const requisitions = [...pendingRequisitions, ...processedRequisitions];
    const total = pendingTotal + processedTotal;

    // Calcular SLA para cada requisición
    const requisitionsWithSLA = requisitions.map(req => {
      const slaBusinessDays = getSLAForStatus(req.status.code);
      let slaDeadline: Date | null = null;
      let isOverdue = false;
      let daysOverdue = 0;

      if (slaBusinessDays > 0) {
        // La fecha de inicio para el SLA es cuando la requisición entró al estado actual
        // Buscar el approval que cambió al estado actual
        const statusChangeApproval = req.approvals?.find(a =>
          a.newStatus?.code === req.status.code
        );

        const slaStartDate = statusChangeApproval?.createdAt || req.createdAt;
        const slaResult = calculateSLA(slaStartDate, slaBusinessDays);

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

  /**
   * Obtiene el detalle de una requisición con su información de cotización actual.
   * Retorna los ítems con sus cotizaciones activas (última versión).
   */
  async getRequisitionQuotation(requisitionId: number, userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que el usuario es del rol Compras
    if (user.role.nombreRol !== 'Compras') {
      throw new ForbiddenException(
        'Solo el rol Compras puede gestionar cotizaciones',
      );
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
      throw new NotFoundException('Requisición no encontrada');
    }

    // Validar estado - permitir visualizar en cualquier estado después de aprobación de gerencia
    // Incluye estados con órdenes de compra para permitir visualización en modo solo lectura
    const validStatuses = [
      'aprobada_gerencia',
      'en_cotizacion',
      'cotizada',
      'en_orden_compra',
      'pendiente_recepcion',
    ];
    if (!validStatuses.includes(requisition.status.code)) {
      throw new BadRequestException(
        `Esta requisición no está disponible para visualización. Estado actual: ${requisition.status.code}`,
      );
    }

    // Obtener cotizaciones activas para cada ítem
    const itemsWithQuotations = await Promise.all(
      requisition.items.map(async (item) => {
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
      }),
    );

    return {
      ...requisition,
      items: itemsWithQuotations,
    };
  }

  /**
   * Gestiona las cotizaciones de una requisición.
   * - Permite asignar acción (cotizar/no_requiere) a cada ítem
   * - Soporta hasta 2 proveedores por ítem
   * - Implementa versionamiento al cambiar proveedores
   * - Cambia estado a 'en_cotizacion' automáticamente
   * - Cambia a 'cotizada' cuando todos los ítems tienen acción asignada
   */
  async manageQuotation(
    requisitionId: number,
    userId: number,
    dto: ManageQuotationDto,
  ) {
    // Validar permiso de cotizar
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.validatePermission(user.role.rolId, PERMISO.COTIZAR, 'gestionar cotizaciones');

    const requisition = await this.requisitionRepository.findOne({
      where: { requisitionId },
      relations: ['items', 'status'],
    });

    if (!requisition) {
      throw new NotFoundException('Requisición no encontrada');
    }

    // Validar estado - permitir editar hasta que se cree la orden de compra
    const validStatuses = ['aprobada_gerencia', 'en_cotizacion', 'cotizada'];
    if (!validStatuses.includes(requisition.status.code)) {
      throw new BadRequestException(
        `Esta requisición no está disponible para cotización. Estado actual: ${requisition.status.code}. Solo se pueden gestionar requisiciones en estado: aprobada_gerencia, en_cotizacion, o cotizada (sin órdenes de compra).`,
      );
    }

    // FIX #1: Verificar que no existan órdenes de compra ya creadas
    const existingOrdersCount = await this.purchaseOrderRepository.count({
      where: { requisitionId },
    });

    if (existingOrdersCount > 0) {
      throw new BadRequestException(
        `No se pueden modificar las cotizaciones porque ya existen ${existingOrdersCount} orden(es) de compra creada(s) para esta requisición.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const previousStatus = requisition.status.code;

      // Procesar cada ítem
      for (const itemDto of dto.items) {
        const item = requisition.items.find((i) => i.itemId === itemDto.itemId);

        if (!item) {
          throw new BadRequestException(
            `Ítem con ID ${itemDto.itemId} no encontrado en la requisición`,
          );
        }

        // Obtener cotizaciones activas actuales
        const currentQuotations = await queryRunner.manager.find(
          RequisitionItemQuotation,
          {
            where: {
              requisitionItemId: item.itemId,
              isActive: true,
            },
          },
        );

        // Determinar si hay cambios en proveedores (para versioning)
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

        // Si hay cambios, desactivar versiones anteriores
        if (needsNewVersion || (currentQuotations.length > 0 && currentQuotations[0].action !== itemDto.action)) {
          await queryRunner.manager.update(
            RequisitionItemQuotation,
            { requisitionItemId: item.itemId, isActive: true },
            { isActive: false },
          );
        }

        // Calcular nueva versión
        const maxVersion = currentQuotations.reduce(
          (max, q) => Math.max(max, q.version),
          0,
        );
        const newVersion = needsNewVersion ? maxVersion + 1 : maxVersion || 1;

        // Crear nuevas cotizaciones
        if (itemDto.action === 'cotizar' && itemDto.suppliers) {
          // Validar que los proveedores existen
          for (const supplierDto of itemDto.suppliers) {
            const supplier = await queryRunner.manager.findOne(Supplier, {
              where: { supplierId: supplierDto.supplierId, isActive: true },
            });

            if (!supplier) {
              throw new BadRequestException(
                `Proveedor con ID ${supplierDto.supplierId} no encontrado o inactivo`,
              );
            }

            const quotation = queryRunner.manager.create(
              RequisitionItemQuotation,
              {
                requisitionItemId: item.itemId,
                action: 'cotizar',
                supplierId: supplierDto.supplierId,
                supplierOrder: supplierDto.supplierOrder,
                observations: supplierDto.observations,
                version: newVersion,
                isActive: true,
                createdBy: userId,
              },
            );

            await queryRunner.manager.save(quotation);
          }
        } else if (itemDto.action === 'no_requiere') {
          // Crear cotización con justificación
          const quotation = queryRunner.manager.create(
            RequisitionItemQuotation,
            {
              requisitionItemId: item.itemId,
              action: 'no_requiere',
              supplierId: null,
              supplierOrder: 1,
              justification: itemDto.justification,
              version: newVersion,
              isActive: true,
              createdBy: userId,
            },
          );

          await queryRunner.manager.save(quotation);
        }
      }

      // Verificar si todos los ítems tienen acción asignada
      const totalItems = requisition.items.length;

      // Contar ítems ÚNICOS que tienen quotations activas (no el total de quotations)
      const itemsWithActionRaw = await queryRunner.manager
        .createQueryBuilder(RequisitionItemQuotation, 'q')
        .select('DISTINCT q.requisitionItemId', 'itemId')
        .where('q.requisitionItemId IN (:...itemIds)', {
          itemIds: requisition.items.map((i) => i.itemId),
        })
        .andWhere('q.isActive = :isActive', { isActive: true })
        .getRawMany();

      const itemsWithAction = itemsWithActionRaw.length;

      // DEBUG: Log para ver qué está pasando
      console.log('🔍 DEBUG - Verificación de estado:');
      console.log(`  Total de ítems en requisición: ${totalItems}`);
      console.log(`  Ítems con quotations activas: ${itemsWithAction}`);
      console.log(`  IDs de ítems con action:`, itemsWithActionRaw);

      // Determinar nuevo estado
      let newStatusCode: string;
      if (itemsWithAction === totalItems) {
        // Todos los ítems tienen acción asignada
        newStatusCode = 'cotizada';
        console.log(`  ✅ Estado cambiará a: ${newStatusCode}`);
      } else {
        // Todavía faltan ítems por asignar
        newStatusCode = 'en_cotizacion';
        console.log(`  ⏳ Estado cambiará a: ${newStatusCode}`);
      }

      // Actualizar estado de la requisición
      const newStatusId = await this.getStatusIdByCode(newStatusCode);
      await queryRunner.manager.update(
        Requisition,
        { requisitionId },
        { statusId: newStatusId },
      );
      console.log(`  💾 Estado actualizado en BD: requisitionId=${requisitionId}, newStatusId=${newStatusId}`);

      // Registrar log
      const log = queryRunner.manager.create(RequisitionLog, {
        requisitionId,
        userId,
        action: 'gestionar_cotizacion',
        previousStatus,
        newStatus: newStatusCode,
        comments: `Cotizaciones actualizadas para ${dto.items.length} ítems`,
      });

      await queryRunner.manager.save(log);

      await queryRunner.commitTransaction();

      // Retornar requisición actualizada con cotizaciones
      return this.getRequisitionQuotation(requisitionId, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================
  // ASIGNAR PRECIOS A COTIZACIONES
  // ============================================
  async assignPrices(
    requisitionId: number,
    userId: number,
    dto: any, // AssignPricesDto
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verificar que la requisición existe y está en estado "cotizada"
      const requisition = await queryRunner.manager.findOne(Requisition, {
        where: { requisitionId },
        relations: ['status', 'operationCenter'],
      });

      if (!requisition) {
        throw new NotFoundException(
          `Requisición con ID ${requisitionId} no encontrada`,
        );
      }

      if (requisition.status.code !== 'cotizada') {
        throw new BadRequestException(
          `Solo se pueden asignar precios a requisiciones en estado "cotizada". Estado actual: ${requisition.status.code}`,
        );
      }

      // 2. Verificar que no existan órdenes de compra ya creadas
      const existingOrdersCount = await this.purchaseOrderRepository.count({
        where: { requisitionId },
      });

      if (existingOrdersCount > 0) {
        throw new BadRequestException(
          `No se pueden asignar precios porque ya existen ${existingOrdersCount} orden(es) de compra creada(s) para esta requisición.`,
        );
      }

      // 3. Procesar cada ítem
      for (const itemDto of dto.items) {
        // Obtener las cotizaciones activas para este ítem
        const quotations = await queryRunner.manager.find(
          RequisitionItemQuotation,
          {
            where: {
              requisitionItemId: itemDto.itemId,
              isActive: true,
              action: 'cotizar',
            },
          },
        );

        if (quotations.length === 0) {
          throw new BadRequestException(
            `No se encontraron cotizaciones activas para el ítem ${itemDto.itemId}`,
          );
        }

        // Si se especificó un quotationId, actualizar ese; sino, actualizar el primero
        let targetQuotation = quotations[0];
        if (itemDto.quotationId) {
          const foundQuotation = quotations.find(
            (q) => q.quotationId === itemDto.quotationId,
          );
          if (!foundQuotation) {
            throw new BadRequestException(
              `Cotización ${itemDto.quotationId} no encontrada o no activa para el ítem ${itemDto.itemId}`,
            );
          }
          targetQuotation = foundQuotation;
        }

        // Actualizar precios en la cotización seleccionada
        await queryRunner.manager.update(
          RequisitionItemQuotation,
          { quotationId: targetQuotation.quotationId },
          {
            unitPrice: itemDto.unitPrice,
            hasIva: itemDto.hasIva,
            discount: itemDto.discount || 0,
            isSelected: true,
          },
        );

        // Si hay múltiples cotizaciones, marcar las demás como no seleccionadas
        if (quotations.length > 1) {
          const otherQuotations = quotations.filter(
            (q) => q.quotationId !== targetQuotation.quotationId,
          );
          for (const otherQuotation of otherQuotations) {
            await queryRunner.manager.update(
              RequisitionItemQuotation,
              { quotationId: otherQuotation.quotationId },
              { isSelected: false },
            );
          }
        }
      }

      // 4. Registrar log
      const log = queryRunner.manager.create(RequisitionLog, {
        requisitionId,
        userId,
        action: 'asignar_precios',
        previousStatus: requisition.status.code,
        newStatus: requisition.status.code,
        comments: `Precios asignados a ${dto.items.length} ítem(s)`,
      });

      await queryRunner.manager.save(log);

      await queryRunner.commitTransaction();

      // Retornar requisición actualizada con cotizaciones y precios
      return this.getRequisitionQuotation(requisitionId, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================
  // CREAR ÓRDENES DE COMPRA
  // ============================================
  async createPurchaseOrders(
    requisitionId: number,
    userId: number,
    dto: CreatePurchaseOrdersDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verificar que la requisición existe y está en estado "cotizada"
      const requisition = await queryRunner.manager.findOne(Requisition, {
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
        throw new NotFoundException('Requisición no encontrada');
      }

      if (requisition.status.code !== 'cotizada') {
        throw new BadRequestException(
          'La requisición debe estar en estado "cotizada" para generar órdenes de compra',
        );
      }

      // 2. Obtener las cotizaciones activas para los ítems
      const itemIds = dto.items.map((i) => i.itemId);
      const quotations = await queryRunner.manager.find(
        RequisitionItemQuotation,
        {
          where: {
            requisitionItemId: In(itemIds),
            isActive: true,
          },
          relations: ['requisitionItem', 'requisitionItem.material', 'supplier'],
        },
      );

      // 3. Agrupar ítems por supplierId
      const itemsBySupplier = new Map<
        number,
        Array<{
          item: typeof dto.items[0];
          quotation: RequisitionItemQuotation;
        }>
      >();

      for (const itemDto of dto.items) {
        const quotation = quotations.find(
          (q) =>
            q.requisitionItemId === itemDto.itemId &&
            q.supplierId === itemDto.supplierId,
        );

        if (!quotation) {
          throw new NotFoundException(
            `No se encontró cotización activa para el ítem ${itemDto.itemId} del proveedor ${itemDto.supplierId}`,
          );
        }

        if (!itemsBySupplier.has(itemDto.supplierId)) {
          itemsBySupplier.set(itemDto.supplierId, []);
        }

        itemsBySupplier
          .get(itemDto.supplierId)!
          .push({ item: itemDto, quotation });
      }

      // 4. Crear una orden de compra por cada proveedor
      const createdPurchaseOrders: PurchaseOrder[] = [];

      for (const [supplierId, items] of itemsBySupplier.entries()) {
        // 4.1 Generar número de orden de compra
        const operationCenterId = requisition.operationCenter.centerId;
        const operationCenterCode = requisition.operationCenter.code;
        const companyName = requisition.operationCenter.company.name;

        // Determinar tipo: OC si contiene "Unión Temporal", sino OS
        const orderType = companyName.includes('Unión Temporal') ? 'OC' : 'OS';

        // Obtener o crear secuencia para este operation_center
        let sequence = await queryRunner.manager.findOne(
          PurchaseOrderSequence,
          {
            where: { operationCenterId },
            lock: { mode: 'pessimistic_write' },
          },
        );

        if (!sequence) {
          sequence = queryRunner.manager.create(PurchaseOrderSequence, {
            operationCenterId,
            lastNumber: 0,
          });
        }

        // Incrementar consecutivo
        sequence.lastNumber += 1;
        await queryRunner.manager.save(sequence);

        // Formatear número: {code}-{OC/OS}-{consecutive}
        const consecutiveStr = sequence.lastNumber.toString().padStart(4, '0');
        const purchaseOrderNumber = `${operationCenterCode}-${orderType}-${consecutiveStr}`;

        // 4.2 Calcular totales para la orden
        let orderSubtotal = 0;
        let orderTotalIva = 0;
        let orderTotalDiscount = 0;

        const orderItems: Array<{
          requisitionItemId: number;
          quotationId: number;
          quantity: number;
          unitPrice: number;
          hasIva: boolean;
          ivaPercentage: number;
          subtotal: number;
          ivaAmount: number;
          discount: number;
          totalAmount: number;
        }> = [];

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

        const orderTotalAmount =
          orderSubtotal + orderTotalIva - orderTotalDiscount;

        // 4.3 Crear la orden de compra
        const pendingApprovalStatusId = await this.getPurchaseOrderStatusId('pendiente_aprobacion_gerencia');

        const purchaseOrder = queryRunner.manager.create(PurchaseOrder, {
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

        // 4.4 Crear los ítems de la orden
        for (let i = 0; i < orderItems.length; i++) {
          const itemData = orderItems[i];
          const { item, quotation } = items[i]; // Obtener la información original

          const poItem = queryRunner.manager.create(PurchaseOrderItem, {
            purchaseOrderId: purchaseOrder.purchaseOrderId,
            ...itemData,
          });
          await queryRunner.manager.save(poItem);

          // 4.4.1 Registrar precio en historial
          const priceHistory = queryRunner.manager.create(MaterialPriceHistory, {
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

      // 5. Cambiar estado de la requisición a "en_orden_compra"
      const previousStatus = requisition.status.code;
      const newStatusId = await this.getStatusIdByCode('en_orden_compra');

      // Usar UPDATE explícito para garantizar que se ejecute la query
      await queryRunner.manager.update(
        Requisition,
        { requisitionId },
        { statusId: newStatusId }
      );

      // 6. Registrar log
      const log = queryRunner.manager.create(RequisitionLog, {
        requisitionId,
        userId,
        action: 'crear_ordenes_compra',
        previousStatus,
        newStatus: 'en_orden_compra',
        comments: `Se generaron ${createdPurchaseOrders.length} orden(es) de compra`,
      });
      await queryRunner.manager.save(log);

      await queryRunner.commitTransaction();

      // 7. Retornar órdenes creadas con relaciones completas
      const ordersWithRelations = await this.purchaseOrderRepository.find({
        where: {
          purchaseOrderId: In(
            createdPurchaseOrders.map((po) => po.purchaseOrderId),
          ),
        },
        relations: ['supplier', 'items', 'items.requisitionItem', 'creator'],
      });

      return {
        requisitionId,
        previousStatus,
        newStatus: 'en_orden_compra',
        purchaseOrders: ordersWithRelations,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================
  // MATERIAL PRICE HISTORY - HISTORIAL DE PRECIOS
  // ============================================

  /**
   * Obtener el último precio registrado para un material + proveedor
   * Retorna el precio más reciente basado en órdenes de compra previas
   */
  async getLatestMaterialPrice(materialId: number, supplierId: number) {
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

  // ============================================
  // MATERIAL RECEIPTS - RECEPCIÓN DE MATERIALES
  // ============================================

  /**
   * Listar requisiciones pendientes de recepción del usuario autenticado
   */
  async getMyPendingReceipts(userId: number, filters: FilterRequisitionsDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Obtener requisiciones del usuario en estado pendiente_recepcion o en_recepcion
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

    // Calcular cantidades recibidas vs ordenadas para cada ítem
    const dataWithReceiptInfo = data.map((requisition: any) => ({
      ...requisition,
      purchaseOrders: (requisition.purchaseOrders || []).map((po: any) => ({
        ...po,
        items: (po.items || []).map((item: any) => {
          const totalReceived = item.receipts?.reduce(
            (sum: number, receipt: any) => sum + Number(receipt.quantityReceived),
            0,
          ) || 0;

          return {
            ...item,
            quantityOrdered: Number(item.quantity),
            quantityReceived: totalReceived,
            quantityPending: Number(item.quantity) - totalReceived,
            receipts: item.receipts, // Mantener receipts para info adicional
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

  /**
   * Ver recepciones de una requisición específica
   */
  async getRequisitionReceipts(requisitionId: number, userId: number) {
    // Verificar que la requisición existe y pertenece al usuario
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
      throw new NotFoundException('Requisición no encontrada');
    }

    if (requisition.createdBy !== userId) {
      throw new ForbiddenException(
        'No tiene permiso para ver las recepciones de esta requisición',
      );
    }

    // Verificar que la requisición esté en proceso de recepción
    if (
      !['pendiente_recepcion', 'en_recepcion', 'recepcion_completa'].includes(
        requisition.status.code,
      )
    ) {
      throw new BadRequestException(
        'Esta requisición no está en proceso de recepción',
      );
    }

    // Calcular totales
    const dataWithReceiptInfo = {
      ...requisition,
      purchaseOrders: (requisition as any).purchaseOrders?.map((po: any) => ({
        ...po,
        items: (po.items || []).map((item: any) => {
          const totalReceived = item.receipts?.reduce(
            (sum: number, receipt: any) => sum + Number(receipt.quantityReceived),
            0,
          ) || 0;

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

  /**
   * Crear recepciones de materiales
   */
  async createMaterialReceipts(
    requisitionId: number,
    userId: number,
    dto: CreateMaterialReceiptDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verificar que la requisición existe y pertenece al usuario
      const requisition = await queryRunner.manager.findOne(Requisition, {
        where: { requisitionId },
        relations: ['status', 'purchaseOrders', 'purchaseOrders.items'],
      });

      if (!requisition) {
        throw new NotFoundException('Requisición no encontrada');
      }

      if (requisition.createdBy !== userId) {
        throw new ForbiddenException(
          'Solo el creador de la requisición puede registrar recepciones',
        );
      }

      // 2. Verificar estado
      if (
        !['pendiente_recepcion', 'en_recepcion'].includes(
          requisition.status.code,
        )
      ) {
        throw new BadRequestException(
          'Esta requisición no está disponible para recepción de materiales',
        );
      }

      // 2.1. VALIDAR QUE TODAS LAS ÓRDENES DE COMPRA ESTÉN APROBADAS
      const approvedStatusId = await this.getPurchaseOrderStatusId('aprobada_gerencia');
      const unapprovedOrders = requisition.purchaseOrders?.filter(
        po => po.approvalStatusId !== approvedStatusId
      );

      if (unapprovedOrders && unapprovedOrders.length > 0) {
        const orderNumbers = unapprovedOrders.map(po => po.purchaseOrderNumber).join(', ');
        throw new BadRequestException(
          `No se puede registrar la recepción porque las siguientes órdenes de compra no han sido aprobadas por Gerencia: ${orderNumbers}. Estado ID: ${unapprovedOrders[0].approvalStatusId}`,
        );
      }

      const previousStatus = requisition.status.code;
      const createdReceipts: MaterialReceipt[] = [];

      // 3. Procesar cada ítem de recepción
      for (const itemDto of dto.items) {
        // Validar que el poItem existe y pertenece a esta requisición
        const poItem = await queryRunner.manager.findOne(PurchaseOrderItem, {
          where: { poItemId: itemDto.poItemId },
          relations: ['purchaseOrder', 'receipts'],
        });

        if (!poItem) {
          throw new BadRequestException(
            `Ítem de orden de compra ${itemDto.poItemId} no encontrado`,
          );
        }

        if (poItem.purchaseOrder.requisitionId !== requisitionId) {
          throw new BadRequestException(
            `El ítem ${itemDto.poItemId} no pertenece a esta requisición`,
          );
        }

        // Calcular cantidad ya recibida
        const totalReceived = poItem.receipts?.reduce(
          (sum, receipt) => sum + Number(receipt.quantityReceived),
          0,
        ) || 0;

        const quantityOrdered = Number(poItem.quantity);
        const quantityPending = quantityOrdered - totalReceived;

        // Validar sobreentrega
        if (itemDto.quantityReceived > quantityPending) {
          // Es una sobreentrega
          if (!itemDto.overdeliveryJustification) {
            throw new BadRequestException(
              `El ítem ${itemDto.poItemId} tiene una sobreentrega (recibiendo ${itemDto.quantityReceived}, pendiente ${quantityPending}). Debe proporcionar una justificación.`,
            );
          }
        }

        // Crear recepción
        const receipt = queryRunner.manager.create(MaterialReceipt, {
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

      // 4. Verificar si todos los ítems están completos
      const allPOItems = (requisition as any).purchaseOrders?.flatMap((po: any) => po.items) || [];

      let allItemsComplete = true;
      for (const poItem of allPOItems) {
        // Recargar ítems con receipts actualizados
        const itemWithReceipts = await queryRunner.manager.findOne(
          PurchaseOrderItem,
          {
            where: { poItemId: poItem.poItemId },
            relations: ['receipts'],
          },
        );

        if (!itemWithReceipts) {
          continue;
        }

        const totalReceived = itemWithReceipts.receipts?.reduce(
          (sum, receipt) => sum + Number(receipt.quantityReceived),
          0,
        ) || 0;

        if (totalReceived < Number(itemWithReceipts.quantity)) {
          allItemsComplete = false;
          break;
        }
      }

      // 5. Actualizar estado de requisición
      let newStatusCode: string;
      if (allItemsComplete) {
        newStatusCode = 'recepcion_completa';
      } else {
        newStatusCode = 'en_recepcion';
      }

      const newStatusId = await this.getStatusIdByCode(newStatusCode);
      await queryRunner.manager.update(
        Requisition,
        { requisitionId },
        { statusId: newStatusId },
      );

      // 6. Registrar log
      const log = queryRunner.manager.create(RequisitionLog, {
        requisitionId,
        userId,
        action: 'registrar_recepcion',
        previousStatus,
        newStatus: newStatusCode,
        comments: `Recepción registrada para ${dto.items.length} ítem(s)`,
      });
      await queryRunner.manager.save(log);

      await queryRunner.commitTransaction();

      // 7. Retornar la requisición actualizada con recepciones
      return this.getRequisitionReceipts(requisitionId, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Actualizar una recepción de material
   */
  async updateMaterialReceipt(
    requisitionId: number,
    receiptId: number,
    userId: number,
    dto: UpdateMaterialReceiptDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verificar que la recepción existe
      const receipt = await queryRunner.manager.findOne(MaterialReceipt, {
        where: { receiptId },
        relations: ['purchaseOrderItem', 'purchaseOrderItem.purchaseOrder'],
      });

      if (!receipt) {
        throw new NotFoundException('Recepción no encontrada');
      }

      // 2. Verificar que pertenece a la requisición correcta
      if (
        receipt.purchaseOrderItem.purchaseOrder.requisitionId !==
        requisitionId
      ) {
        throw new BadRequestException(
          'Esta recepción no pertenece a la requisición especificada',
        );
      }

      // 3. Verificar permisos
      const requisition = await queryRunner.manager.findOne(Requisition, {
        where: { requisitionId },
      });

      if (!requisition) {
        throw new NotFoundException('Requisición no encontrada');
      }

      if (requisition.createdBy !== userId) {
        throw new ForbiddenException(
          'Solo el creador de la requisición puede editar recepciones',
        );
      }

      // 4. Si se actualiza la cantidad, validar sobreentrega
      if (dto.quantityReceived !== undefined) {
        const poItem = receipt.purchaseOrderItem;
        const allReceipts = await queryRunner.manager.find(MaterialReceipt, {
          where: { poItemId: poItem.poItemId },
        });

        const totalOtherReceipts = allReceipts
          .filter((r) => r.receiptId !== receiptId)
          .reduce((sum, r) => sum + Number(r.quantityReceived), 0);

        const newTotal = totalOtherReceipts + dto.quantityReceived;
        const quantityOrdered = Number(poItem.quantity);

        if (newTotal > quantityOrdered) {
          // Es sobreentrega
          if (
            !dto.overdeliveryJustification &&
            !receipt.overdeliveryJustification
          ) {
            throw new BadRequestException(
              'La nueva cantidad genera una sobreentrega. Debe proporcionar una justificación.',
            );
          }
        }
      }

      // 5. Actualizar recepción
      Object.assign(receipt, dto);
      await queryRunner.manager.save(receipt);

      // 6. Recalcular estado de requisición
      const allPOItems = await queryRunner.manager
        .createQueryBuilder(PurchaseOrderItem, 'poItem')
        .leftJoin('poItem.purchaseOrder', 'po')
        .leftJoinAndSelect('poItem.receipts', 'receipts')
        .where('po.requisition_id = :requisitionId', { requisitionId })
        .getMany();

      let allItemsComplete = true;
      for (const poItem of allPOItems) {
        const totalReceived = poItem.receipts?.reduce(
          (sum, r) => sum + Number(r.quantityReceived),
          0,
        ) || 0;

        if (totalReceived < Number(poItem.quantity)) {
          allItemsComplete = false;
          break;
        }
      }

      const newStatusCode = allItemsComplete
        ? 'recepcion_completa'
        : 'en_recepcion';
      const newStatusId = await this.getStatusIdByCode(newStatusCode);

      await queryRunner.manager.update(
        Requisition,
        { requisitionId },
        { statusId: newStatusId },
      );

      await queryRunner.commitTransaction();

      // Retornar recepción actualizada
      return queryRunner.manager.findOne(MaterialReceipt, {
        where: { receiptId },
        relations: [
          'purchaseOrderItem',
          'purchaseOrderItem.requisitionItem',
          'purchaseOrderItem.requisitionItem.material',
          'creator',
        ],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================
  // CONSULTAR ÓRDENES DE COMPRA
  // ============================================

  /**
   * Obtener todas las órdenes de compra con paginación y filtros
   */
  async getPurchaseOrders(
    userId: number,
    page: number = 1,
    limit: number = 10,
    filters?: {
      requisitionId?: number;
      supplierId?: number;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const skip = (page - 1) * limit;

    // Construir condiciones de filtro
    const where: any = {};

    if (filters?.requisitionId) {
      where.requisitionId = filters.requisitionId;
    }

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.fromDate && filters?.toDate) {
      where.issueDate = Between(
        new Date(filters.fromDate),
        new Date(filters.toDate),
      );
    } else if (filters?.fromDate) {
      where.issueDate = Between(new Date(filters.fromDate), new Date());
    }

    // Consultar órdenes con relaciones
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

  /**
   * Obtener detalle de una orden de compra específica
   */
  async getPurchaseOrderById(purchaseOrderId: number) {
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
      throw new NotFoundException(
        `Orden de compra con ID ${purchaseOrderId} no encontrada`,
      );
    }

    return purchaseOrder;
  }

  /**
   * Obtener órdenes de compra de una requisición específica
   */
  async getPurchaseOrdersByRequisition(requisitionId: number, userId: number) {
    // Verificar que la requisición existe
    const requisition = await this.requisitionRepository.findOne({
      where: { requisitionId },
      relations: ['status'],
    });

    if (!requisition) {
      throw new NotFoundException(
        `Requisición con ID ${requisitionId} no encontrada`,
      );
    }

    // Obtener órdenes de compra de la requisición
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

  // ============================================
  // PURCHASE ORDER APPROVAL - APROBACIÓN DE ÓRDENES DE COMPRA
  // ============================================

  /**
   * Obtener órdenes de compra pendientes de aprobación por Gerencia
   */
  async getPendingPurchaseOrdersForApproval(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    // Validar que el usuario es Gerencia
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role.nombreRol !== 'Gerencia') {
      throw new ForbiddenException(
        'Solo el rol Gerencia puede aprobar órdenes de compra',
      );
    }

    // Query 1: Obtener TODAS las OCs pendientes (sin límite)
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

    // Query 2: Obtener últimas 20 OCs procesadas (aprobadas o rechazadas)
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
      .take(20); // Limitar a 20 procesadas

    const [processedOrders, processedTotal] = await processedQueryBuilder.getManyAndCount();

    // Combinar resultados: pendientes primero, luego procesadas
    const purchaseOrders = [...pendingOrders, ...processedOrders];
    const total = pendingTotal + processedTotal;

    // Calcular si está vencida (deadline de 1 día hábil desde creación)
    const purchaseOrdersWithDeadline = purchaseOrders.map((po) => {
      const deadline = addBusinessDays(po.createdAt, 1);
      const isOverdue = new Date() > deadline;
      const daysOverdue = isOverdue
        ? calculateBusinessDaysBetween(deadline, new Date())
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

  /**
   * Obtener detalle de una orden de compra para aprobar
   */
  async getPurchaseOrderForApproval(purchaseOrderId: number, userId: number) {
    // Validar que el usuario es Gerencia
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user || user.role.nombreRol !== 'Gerencia') {
      throw new ForbiddenException(
        'Solo el rol Gerencia puede ver órdenes de compra para aprobar',
      );
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
      throw new NotFoundException(
        `Orden de compra con ID ${purchaseOrderId} no encontrada`,
      );
    }

    // Calcular deadline
    const deadline = addBusinessDays(purchaseOrder.createdAt, 1);
    const isOverdue = new Date() > deadline;
    const daysOverdue = isOverdue
      ? calculateBusinessDaysBetween(deadline, new Date())
      : 0;

    return {
      ...purchaseOrder,
      deadline,
      isOverdue,
      daysOverdue,
    };
  }

  /**
   * Aprobar o rechazar ítems de una orden de compra
   * Si todos los ítems son aprobados, la OC se aprueba
   * Si algún ítem es rechazado, la OC se rechaza con justificación
   */
  async approvePurchaseOrder(
    purchaseOrderId: number,
    userId: number,
    dto: ApprovePurchaseOrderDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar usuario
      const user = await queryRunner.manager.findOne(User, {
        where: { userId },
        relations: ['role'],
      });

      if (!user || user.role.nombreRol !== 'Gerencia') {
        throw new ForbiddenException(
          'Solo el rol Gerencia puede aprobar órdenes de compra',
        );
      }

      // 2. Obtener orden de compra
      const purchaseOrder = await queryRunner.manager.findOne(PurchaseOrder, {
        where: { purchaseOrderId },
        relations: ['items', 'approvalStatus'],
      });

      if (!purchaseOrder) {
        throw new NotFoundException('Orden de compra no encontrada');
      }

      // 3. Validar estado
      const pendingStatusId = await this.getPurchaseOrderStatusId('pendiente_aprobacion_gerencia');
      if (purchaseOrder.approvalStatusId !== pendingStatusId) {
        throw new BadRequestException(
          `Esta orden de compra no puede ser aprobada. Estado actual ID: ${purchaseOrder.approvalStatusId}`,
        );
      }

      // 4. Validar que todos los ítems de la OC están en la decisión
      if (dto.items.length !== purchaseOrder.items.length) {
        throw new BadRequestException(
          `Debe proporcionar una decisión para todos los ${purchaseOrder.items.length} ítems de la orden de compra`,
        );
      }

      // 5. Determinar si es aprobación o rechazo
      const allApproved = dto.items.every(
        (item) => item.decision === 'approved',
      );
      const anyRejected = dto.items.some(
        (item) => item.decision === 'rejected',
      );

      if (anyRejected && !dto.rejectionReason) {
        throw new BadRequestException(
          'Debe proporcionar una razón de rechazo cuando se rechaza algún ítem',
        );
      }

      // 6. Crear registro de aprobación
      const deadline = addBusinessDays(purchaseOrder.createdAt, 1);
      const isOverdue = new Date() > deadline;

      const approval = queryRunner.manager.create(PurchaseOrderApproval, {
        purchaseOrderId,
        approverId: userId,
        approvalStatus: allApproved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        comments: dto.generalComments || null,
        rejectionReason: dto.rejectionReason || null,
        approvalDate: new Date(),
        deadline,
        isOverdue,
      });

      const savedApproval = await queryRunner.manager.save(approval);

      // 7. Crear aprobaciones de ítems
      for (const itemDto of dto.items) {
        const itemApproval = queryRunner.manager.create(
          PurchaseOrderItemApproval,
          {
            poApprovalId: savedApproval.approvalId,
            poItemId: itemDto.poItemId,
            approvalStatus:
              itemDto.decision === 'approved' ? ItemApprovalStatus.APPROVED : ItemApprovalStatus.REJECTED,
            comments: itemDto.comments || null,
          },
        );

        await queryRunner.manager.save(itemApproval);
      }

      // 8. Actualizar estado de la orden de compra
      let newStatusId: number;
      if (allApproved) {
        newStatusId = await this.getPurchaseOrderStatusId('aprobada_gerencia');
      } else {
        newStatusId = await this.getPurchaseOrderStatusId('rechazada_gerencia');
        // Incrementar contador de rechazos
        purchaseOrder.rejectionCount = (purchaseOrder.rejectionCount || 0) + 1;
        purchaseOrder.lastRejectionReason = dto.rejectionReason || null;
      }

      // Actualizar estado de la orden de compra usando update para garantizar que se guarde
      await queryRunner.manager.update(
        PurchaseOrder,
        { purchaseOrderId },
        {
          approvalStatusId: newStatusId,
          currentApproverId: userId,
          rejectionCount: allApproved ? purchaseOrder.rejectionCount : (purchaseOrder.rejectionCount || 0) + 1,
          lastRejectionReason: allApproved ? purchaseOrder.lastRejectionReason : (dto.rejectionReason || null),
        },
      );

      // 9. Si la OC fue aprobada, verificar si TODAS las OCs de la requisición están aprobadas
      if (allApproved) {
        // Obtener todas las órdenes de compra de esta requisición
        const allPurchaseOrders = await queryRunner.manager.find(PurchaseOrder, {
          where: { requisitionId: purchaseOrder.requisitionId },
        });

        // Verificar si todas están aprobadas
        const approvedStatusId = await this.getPurchaseOrderStatusId('aprobada_gerencia');
        const allOrdersApproved = allPurchaseOrders.every(
          (po) => po.approvalStatusId === approvedStatusId,
        );

        if (allOrdersApproved) {
          // Obtener la requisición para verificar su estado actual
          const requisition = await queryRunner.manager.findOne(Requisition, {
            where: { requisitionId: purchaseOrder.requisitionId },
            relations: ['status'],
          });

          if (requisition && requisition.status.code === 'en_orden_compra') {
            // Cambiar estado de la requisición a "pendiente_recepcion"
            const previousReqStatus = requisition.status.code;
            const pendingReceptionStatusId = await this.getStatusIdByCode('pendiente_recepcion');

            await queryRunner.manager.update(
              Requisition,
              { requisitionId: requisition.requisitionId },
              { statusId: pendingReceptionStatusId },
            );

            // Registrar log de cambio de estado de requisición
            const reqLog = queryRunner.manager.create(RequisitionLog, {
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

      // 10. Retornar orden actualizada
      return this.getPurchaseOrderById(purchaseOrderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Rechazar una orden de compra completa con justificación
   */
  async rejectPurchaseOrder(
    purchaseOrderId: number,
    userId: number,
    rejectionReason: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar usuario
      const user = await queryRunner.manager.findOne(User, {
        where: { userId },
        relations: ['role'],
      });

      if (!user || user.role.nombreRol !== 'Gerencia') {
        throw new ForbiddenException(
          'Solo el rol Gerencia puede rechazar órdenes de compra',
        );
      }

      // 2. Obtener orden de compra
      const purchaseOrder = await queryRunner.manager.findOne(PurchaseOrder, {
        where: { purchaseOrderId },
        relations: ['items', 'approvalStatus'],
      });

      if (!purchaseOrder) {
        throw new NotFoundException('Orden de compra no encontrada');
      }

      // 3. Validar estado
      const pendingStatusId = await this.getPurchaseOrderStatusId('pendiente_aprobacion_gerencia');
      if (purchaseOrder.approvalStatusId !== pendingStatusId) {
        throw new BadRequestException(
          `Esta orden de compra no puede ser rechazada. Estado actual ID: ${purchaseOrder.approvalStatusId}`,
        );
      }

      // 4. Validar que se proporcione razón
      if (!rejectionReason || rejectionReason.trim() === '') {
        throw new BadRequestException(
          'La razón de rechazo es obligatoria',
        );
      }

      // 5. Crear registro de aprobación con rechazo
      const deadline = addBusinessDays(purchaseOrder.createdAt, 1);
      const isOverdue = new Date() > deadline;

      const approval = queryRunner.manager.create(PurchaseOrderApproval, {
        purchaseOrderId,
        approverId: userId,
        approvalStatus: ApprovalStatus.REJECTED,
        comments: null,
        rejectionReason,
        approvalDate: new Date(),
        deadline,
        isOverdue,
      });

      const savedApproval = await queryRunner.manager.save(approval);

      // 6. Crear aprobaciones de ítems (todos rechazados)
      for (const item of purchaseOrder.items) {
        const itemApproval = queryRunner.manager.create(
          PurchaseOrderItemApproval,
          {
            poApprovalId: savedApproval.approvalId,
            poItemId: item.poItemId,
            approvalStatus: ItemApprovalStatus.REJECTED,
            comments: 'Rechazado junto con toda la orden de compra',
          },
        );

        await queryRunner.manager.save(itemApproval);
      }

      // 7. Actualizar estado de la orden de compra
      const rejectedStatusId = await this.getPurchaseOrderStatusId('rechazada_gerencia');
      purchaseOrder.approvalStatusId = rejectedStatusId;
      purchaseOrder.rejectionCount = (purchaseOrder.rejectionCount || 0) + 1;
      purchaseOrder.lastRejectionReason = rejectionReason;
      purchaseOrder.currentApproverId = userId;

      await queryRunner.manager.save(purchaseOrder);

      await queryRunner.commitTransaction();

      // 8. Retornar orden actualizada
      return this.getPurchaseOrderById(purchaseOrderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reenviar una orden de compra rechazada después de correcciones (Compras)
   */
  async resubmitPurchaseOrder(
    purchaseOrderId: number,
    userId: number,
    comments?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar usuario es Compras
      const user = await queryRunner.manager.findOne(User, {
        where: { userId },
        relations: ['role'],
      });

      if (!user || user.role.nombreRol !== 'Compras') {
        throw new ForbiddenException(
          'Solo el rol Compras puede reenviar órdenes de compra',
        );
      }

      // 2. Obtener orden de compra
      const purchaseOrder = await queryRunner.manager.findOne(PurchaseOrder, {
        where: { purchaseOrderId },
        relations: ['approvalStatus'],
      });

      if (!purchaseOrder) {
        throw new NotFoundException('Orden de compra no encontrada');
      }

      // 3. Validar que está rechazada
      const rejectedStatusId = await this.getPurchaseOrderStatusId('rechazada_gerencia');
      if (purchaseOrder.approvalStatusId !== rejectedStatusId) {
        throw new BadRequestException(
          'Solo se pueden reenviar órdenes de compra que han sido rechazadas',
        );
      }

      // 4. Cambiar estado a pendiente de aprobación
      const pendingStatusId = await this.getPurchaseOrderStatusId('pendiente_aprobacion_gerencia');
      purchaseOrder.approvalStatusId = pendingStatusId;

      await queryRunner.manager.save(purchaseOrder);

      await queryRunner.commitTransaction();

      // 5. Retornar orden actualizada
      return this.getPurchaseOrderById(purchaseOrderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
