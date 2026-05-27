import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RequisitionLog } from "../../database/entities/requisition-log.entity";
import { Requisition } from "../../database/entities/requisition.entity";
import { PurchaseOrder } from "../../database/entities/purchase-order.entity";

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(RequisitionLog)
    private requisitionLogRepository: Repository<RequisitionLog>,
    @InjectRepository(Requisition)
    private requisitionRepository: Repository<Requisition>,
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
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
      requisitionNumber?: string;
      companyName?: string;
      userName?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.requisitionLogRepository
      .createQueryBuilder("log")
      .leftJoinAndSelect("log.user", "user")
      .leftJoinAndSelect("log.requisition", "requisition")
      .leftJoinAndSelect("requisition.operationCenter", "operationCenter")
      .leftJoinAndSelect("operationCenter.company", "company");

    if (filters?.userId) {
      queryBuilder.andWhere("log.userId = :userId", { userId: filters.userId });
    }

    if (filters?.action) {
      queryBuilder.andWhere("log.action = :action", { action: filters.action });
    }

    if (filters?.requisitionId) {
      queryBuilder.andWhere("log.requisitionId = :requisitionId", {
        requisitionId: filters.requisitionId,
      });
    }

    if (filters?.requisitionNumber) {
      queryBuilder.andWhere(
        "requisition.requisitionNumber ILIKE :requisitionNumber",
        {
          requisitionNumber: `%${filters.requisitionNumber}%`,
        },
      );
    }

    if (filters?.companyName) {
      queryBuilder.andWhere("company.name ILIKE :companyName", {
        companyName: `%${filters.companyName}%`,
      });
    }

    if (filters?.userName) {
      queryBuilder.andWhere("user.nombre ILIKE :userName", {
        userName: `%${filters.userName}%`,
      });
    }

    if (filters?.fromDate && filters?.toDate) {
      queryBuilder.andWhere("log.createdAt BETWEEN :fromDate AND :toDate", {
        fromDate: new Date(filters.fromDate),
        toDate: new Date(`${filters.toDate}T23:59:59`),
      });
    } else if (filters?.fromDate) {
      queryBuilder.andWhere("log.createdAt >= :fromDate", {
        fromDate: new Date(filters.fromDate),
      });
    } else if (filters?.toDate) {
      queryBuilder.andWhere("log.createdAt <= :toDate", {
        toDate: new Date(`${filters.toDate}T23:59:59`),
      });
    }

    // Ordenar por fecha descendente (más recientes primero)
    queryBuilder.orderBy("log.createdAt", "DESC");

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
      .createQueryBuilder("log")
      .leftJoinAndSelect("log.user", "user")
      .leftJoinAndSelect("log.requisition", "requisition")
      .leftJoinAndSelect("requisition.company", "company")
      .leftJoinAndSelect("requisition.project", "project")
      .leftJoinAndSelect("requisition.operationCenter", "operationCenter")
      .leftJoinAndSelect("requisition.projectCode", "projectCode")
      .leftJoinAndSelect("requisition.creator", "creator")
      .leftJoinAndSelect("requisition.status", "status")
      .leftJoinAndSelect("requisition.reviewer", "reviewer")
      .leftJoinAndSelect("requisition.approver", "approver")
      .leftJoinAndSelect("requisition.items", "items")
      .leftJoinAndSelect("items.material", "material")
      .leftJoinAndSelect("items.quotations", "quotations")
      .leftJoinAndSelect("quotations.supplier", "supplier")
      .leftJoinAndSelect("requisition.purchaseOrders", "purchaseOrders")
      .leftJoinAndSelect("purchaseOrders.items", "purchaseOrderItems")
      .leftJoinAndSelect("purchaseOrders.supplier", "poSupplier")
      .leftJoinAndSelect("requisition.approvals", "approvals")
      .leftJoinAndSelect("approvals.user", "approvalUser")
      .where("log.requisitionId = :requisitionId", { requisitionId })
      .orderBy("log.createdAt", "ASC")
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
          const selectedQuotation =
            item.quotations.find((q) => q.isSelected) || item.quotations[0];
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
        const diffMs =
          new Date(log.createdAt).getTime() -
          new Date(prevLog.createdAt).getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          timeSincePrevious = `${diffDays} día${diffDays > 1 ? "s" : ""}`;
        } else if (diffHours > 0) {
          timeSincePrevious = `${diffHours} hora${diffHours > 1 ? "s" : ""}`;
        } else {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          if (diffMinutes > 0) {
            timeSincePrevious = `${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
          } else {
            timeSincePrevious = "unos segundos";
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
   * Obtener matriz de estados de requisiciones
   */
  async getMatrix(filters?: {
    fromDate?: string;
    toDate?: string;
    requisitionNumber?: string;
    companyName?: string;
  }) {
    const ACTION_ORDER = [
      'crear_requisicion',
      'revisar_aprobar',
      'revisar_rechazar',
      'autorizar_aprobar',
      'autorizar_rechazar',
      'aprobar_gerencia',
      'rechazar_gerencia',
      'correccion_estado',
      'gestionar_cotizacion',
      'crear_ordenes_compra',
      'aprobar_todas_ordenes_compra',
      'registrar_recepcion',
    ];

    const qb = this.requisitionLogRepository
      .createQueryBuilder('log')
      .select('log.requisitionId', 'requisitionId')
      .addSelect('log.action', 'action')
      .addSelect('MIN(log.createdAt)', 'fecha')
      .addSelect('requisition.requisitionNumber', 'requisitionNumber')
      .addSelect('company.name', 'companyName')
      .addSelect('status.name', 'statusName')
      .addSelect('status.color', 'statusColor')
      .leftJoin('log.requisition', 'requisition')
      .leftJoin('requisition.operationCenter', 'operationCenter')
      .leftJoin('operationCenter.company', 'company')
      .leftJoin('requisition.status', 'status')
      .groupBy('log.requisitionId')
      .addGroupBy('log.action')
      .addGroupBy('requisition.requisitionNumber')
      .addGroupBy('company.name')
      .addGroupBy('status.name')
      .addGroupBy('status.color')
      .orderBy('log.requisitionId', 'ASC');

    if (filters?.requisitionNumber) {
      qb.andWhere('requisition.requisitionNumber ILIKE :reqNum', {
        reqNum: `%${filters.requisitionNumber}%`,
      });
    }
    if (filters?.companyName) {
      qb.andWhere('company.name ILIKE :companyName', {
        companyName: `%${filters.companyName}%`,
      });
    }
    if (filters?.fromDate) {
      qb.andWhere('requisition.createdAt >= :fromDate', { fromDate: new Date(filters.fromDate) });
    }
    if (filters?.toDate) {
      qb.andWhere('requisition.createdAt <= :toDate', {
        toDate: new Date(`${filters.toDate}T23:59:59`),
      });
    }

    const rawRows = await qb.getRawMany();

    const map = new Map<number, {
      requisitionId: number;
      requisitionNumber: string;
      companyName: string;
      currentStatus: { name: string; color: string } | null;
      events: Record<string, string>;
      minDate: string;
    }>();

    for (const row of rawRows) {
      const id = Number(row.requisitionId);
      if (!map.has(id)) {
        map.set(id, {
          requisitionId: id,
          requisitionNumber: row.requisitionNumber || `#${id}`,
          companyName: row.companyName || '-',
          currentStatus: row.statusName ? { name: row.statusName, color: row.statusColor || '#6b7280' } : null,
          events: {},
          minDate: row.fecha,
        });
      }
      const entry = map.get(id)!;
      if (row.action && row.fecha) {
        entry.events[row.action] = row.fecha;
        if (!entry.minDate || row.fecha < entry.minDate) entry.minDate = row.fecha;
      }
    }

    const presentActions = new Set<string>();
    for (const entry of map.values()) {
      Object.keys(entry.events).forEach((a) => presentActions.add(a));
    }
    const actions = ACTION_ORDER.filter((a) => presentActions.has(a));

    const rows = Array.from(map.values())
      .sort((a, b) => new Date(a.minDate).getTime() - new Date(b.minDate).getTime())
      .map(({ minDate, ...rest }) => rest);

    return { actions, rows };
  }

  /**
   * Obtener estadísticas de auditoría
   */
  async getAuditStats() {
    const [totalLogs, totalRequisitions, totalPurchaseOrders] = await Promise.all([
      this.requisitionLogRepository.count(),
      this.requisitionRepository.count(),
      this.purchaseOrderRepository.count(),
    ]);

    const logsByAction = await this.requisitionLogRepository
      .createQueryBuilder("log")
      .select("log.action", "action")
      .addSelect("COUNT(*)", "count")
      .groupBy("log.action")
      .getRawMany();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogs = await this.requisitionLogRepository
      .createQueryBuilder("log")
      .where("log.createdAt >= :sevenDaysAgo", { sevenDaysAgo })
      .getCount();

    return {
      totalLogs,
      totalRequisitions,
      totalPurchaseOrders,
      logsByAction,
      recentLogs,
    };
  }
}
