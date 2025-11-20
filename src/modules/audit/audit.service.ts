import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequisitionLog } from '../../database/entities/requisition-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(RequisitionLog)
    private requisitionLogRepository: Repository<RequisitionLog>,
  ) {}

  /**
   * Obtener todos los logs de auditoría del módulo de compras con paginación y filtros
   */
  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
      userId?: number;
      action?: string;
      requisitionId?: number;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const skip = (page - 1) * limit;

    // Construir query con Query Builder para mejor control
    const queryBuilder = this.requisitionLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.requisition', 'requisition')
      .leftJoinAndSelect('requisition.operationCenter', 'operationCenter')
      .leftJoinAndSelect('operationCenter.company', 'company');

    // Aplicar filtros
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
    } else if (filters?.fromDate) {
      queryBuilder.andWhere('log.createdAt >= :fromDate', {
        fromDate: new Date(filters.fromDate),
      });
    } else if (filters?.toDate) {
      queryBuilder.andWhere('log.createdAt <= :toDate', {
        toDate: new Date(filters.toDate),
      });
    }

    // Ordenar por fecha descendente (más recientes primero)
    queryBuilder.orderBy('log.createdAt', 'DESC');

    // Aplicar paginación
    queryBuilder.skip(skip).take(limit);

    // Ejecutar query
    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      data: logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener detalle completo de una requisición para auditoría
   */
  async getRequisitionDetail(requisitionId: number) {
    // Obtener todos los logs de esta requisición con sus relaciones
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

    // La primera entrada del log contiene la requisición completa
    const requisition = logs[0].requisition;

    // Calcular montos totales de las cotizaciones
    let subtotal = 0;
    let iva = 0;
    let total = 0;

    if (requisition.items && requisition.items.length > 0) {
      requisition.items.forEach((item) => {
        if (item.quotations && item.quotations.length > 0) {
          // Usar la cotización seleccionada o la primera disponible
          const selectedQuotation = item.quotations.find((q) => q.isSelected) || item.quotations[0];
          if (selectedQuotation && selectedQuotation.unitPrice) {
            const itemSubtotal = selectedQuotation.unitPrice * item.quantity;
            subtotal += itemSubtotal;
          }
        }
      });
      iva = subtotal * 0.16; // IVA 16%
      total = subtotal + iva;
    }

    // Calcular tiempo entre acciones
    const timeline = logs.map((log, index) => {
      let timeSincePrevious: string | null = null;
      if (index > 0) {
        const prevLog = logs[index - 1];
        const diffMs = new Date(log.createdAt).getTime() - new Date(prevLog.createdAt).getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          timeSincePrevious = `${diffDays} día${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
          timeSincePrevious = `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        } else {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          if (diffMinutes > 0) {
            timeSincePrevious = `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
          } else {
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

  /**
   * Obtener estadísticas de auditoría
   */
  async getAuditStats() {
    const totalLogs = await this.requisitionLogRepository.count();

    // Logs por acción
    const logsByAction = await this.requisitionLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action')
      .getRawMany();

    // Logs de los últimos 7 días
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
}
