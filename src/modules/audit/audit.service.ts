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
    materialCode?: string;
    requesterName?: string;
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
      'anular_requisicion',
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
    if (filters?.materialCode) {
      // Solo requisiciones que contengan el material (por código o descripción).
      qb.andWhere(
        `requisition.requisitionId IN (
          SELECT ri.requisition_id FROM requisition_items ri
          JOIN materials m ON m.material_id = ri.material_id
          WHERE m.code ILIKE :matCode OR m.description ILIKE :matCode
        )`,
        { matCode: `%${filters.materialCode}%` },
      );
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

    const requisitionIds = Array.from(map.keys());

    // Fecha de envío de la factura a contabilidad (la última, por requisición). Se adjunta
    // como evento sintético 'factura_contabilidad' para poder medir tiempos en el frontend.
    if (requisitionIds.length > 0) {
      const sentResult = await this.purchaseOrderRepository.query(
        `SELECT po.requisition_id AS requisition_id,
                MAX(i.sent_to_accounting_date)::text AS sent_date
         FROM invoices i
         JOIN purchase_orders po ON po.purchase_order_id = i.purchase_order_id
         WHERE po.requisition_id = ANY($1::int[])
           AND i.sent_to_accounting = true
           AND i.sent_to_accounting_date IS NOT NULL
         GROUP BY po.requisition_id`,
        [requisitionIds],
      );
      const sentMap = new Map<number, string>();
      for (const r of sentResult) {
        if (r.sent_date) sentMap.set(Number(r.requisition_id), r.sent_date);
      }
      for (const row of rows) {
        const sent = sentMap.get(row.requisitionId);
        if (sent) row.events['factura_contabilidad'] = sent;
      }
    }

    let totalPurchaseOrders = 0;
    let purchaseOrdersByMonth: { year: number; month: number; count: number }[] = [];
    let totalVoidedRequisitions = 0;
    let voidedRequisitionsByMonth: { year: number; month: number; count: number }[] = [];
    if (requisitionIds.length > 0) {
      const poResult = await this.purchaseOrderRepository.query(
        `SELECT COUNT(*) as count FROM purchase_orders WHERE requisition_id = ANY($1::int[])`,
        [requisitionIds],
      );
      totalPurchaseOrders = parseInt(poResult[0]?.count ?? '0');

      const poByMonthResult = await this.purchaseOrderRepository.query(
        `SELECT EXTRACT(YEAR FROM created_at)::int AS year, EXTRACT(MONTH FROM created_at)::int AS month, COUNT(*)::int AS count
         FROM purchase_orders
         WHERE requisition_id = ANY($1::int[])
         GROUP BY year, month
         ORDER BY year, month`,
        [requisitionIds],
      );
      purchaseOrdersByMonth = poByMonthResult.map((r: any) => ({
        year: r.year,
        month: r.month,
        count: r.count,
      }));

      const voidedResult = await this.requisitionLogRepository.query(
        `SELECT COUNT(DISTINCT requisition_id)::int AS count
         FROM requisition_logs
         WHERE requisition_id = ANY($1::int[])
           AND action = 'anular_requisicion'`,
        [requisitionIds],
      );
      totalVoidedRequisitions = parseInt(voidedResult[0]?.count ?? '0');

      const voidedByMonthResult = await this.requisitionLogRepository.query(
        `SELECT EXTRACT(YEAR FROM created_at)::int AS year, EXTRACT(MONTH FROM created_at)::int AS month, COUNT(DISTINCT requisition_id)::int AS count
         FROM requisition_logs
         WHERE requisition_id = ANY($1::int[])
           AND action = 'anular_requisicion'
         GROUP BY year, month
         ORDER BY year, month`,
        [requisitionIds],
      );
      voidedRequisitionsByMonth = voidedByMonthResult.map((r: any) => ({
        year: r.year,
        month: r.month,
        count: r.count,
      }));
    }

    // Montos por mes: valor de órdenes de compra y de facturación.
    let purchaseOrderValueByMonth: { year: number; month: number; value: number }[] = [];
    let invoiceValueByMonth: { year: number; month: number; value: number }[] = [];
    let totalPurchaseOrderValue = 0;
    let totalInvoiceValue = 0;
    if (requisitionIds.length > 0) {
      const poValueResult = await this.purchaseOrderRepository.query(
        `SELECT EXTRACT(YEAR FROM created_at)::int AS year, EXTRACT(MONTH FROM created_at)::int AS month, COALESCE(SUM(total_amount), 0)::float AS value
         FROM purchase_orders
         WHERE requisition_id = ANY($1::int[])
         GROUP BY year, month
         ORDER BY year, month`,
        [requisitionIds],
      );
      purchaseOrderValueByMonth = poValueResult.map((r: any) => ({ year: r.year, month: r.month, value: Number(r.value) }));
      totalPurchaseOrderValue = purchaseOrderValueByMonth.reduce((s, r) => s + r.value, 0);

      const invValueResult = await this.purchaseOrderRepository.query(
        `SELECT EXTRACT(YEAR FROM i.issue_date)::int AS year, EXTRACT(MONTH FROM i.issue_date)::int AS month, COALESCE(SUM(i.amount), 0)::float AS value
         FROM invoices i
         JOIN purchase_orders po ON po.purchase_order_id = i.purchase_order_id
         WHERE po.requisition_id = ANY($1::int[])
         GROUP BY year, month
         ORDER BY year, month`,
        [requisitionIds],
      );
      invoiceValueByMonth = invValueResult.map((r: any) => ({ year: r.year, month: r.month, value: Number(r.value) }));
      totalInvoiceValue = invoiceValueByMonth.reduce((s, r) => s + r.value, 0);
    }

    // Materiales más pedidos: por número de requisiciones que lo incluyen y cantidad total.
    // Si hay filtro de material, solo se cuentan los materiales que coinciden (no todos los
    // de la requisición), para que el gráfico no muestre los demás ítems del mismo pedido.
    // El filtro de persona (requesterName) aplica SOLO a este gráfico, no al resto del tab.
    let topMaterials: { code: string; description: string; reqCount: number; totalQuantity: number; totalAmount: number }[] = [];
    if (requisitionIds.length > 0) {
      const matParams: any[] = [requisitionIds];
      let matFilterClause = '';
      if (filters?.materialCode) {
        matParams.push(`%${filters.materialCode}%`);
        matFilterClause += ` AND (m.code ILIKE $${matParams.length} OR m.description ILIKE $${matParams.length})`;
      }
      if (filters?.requesterName) {
        matParams.push(`%${filters.requesterName}%`);
        matFilterClause += ` AND ri.requisition_id IN (
          SELECT r.requisition_id FROM requisitions r
          JOIN users u ON u.user_id = r.created_by
          WHERE u.nombre ILIKE $${matParams.length}
        )`;
      }
      // Dinero = suma del total de los ítems de OC ligados al ítem de requisición del material.
      const matResult = await this.requisitionRepository.query(
        `SELECT m.code AS code, m.description AS description,
                COUNT(DISTINCT ri.requisition_id)::int AS req_count,
                COALESCE(SUM(ri.quantity), 0)::float AS total_quantity,
                COALESCE(SUM(poi.total_amount), 0)::float AS total_amount
         FROM requisition_items ri
         JOIN materials m ON m.material_id = ri.material_id
         LEFT JOIN purchase_order_items poi ON poi.requisition_item_id = ri.item_id
         WHERE ri.requisition_id = ANY($1::int[])${matFilterClause}
         GROUP BY m.code, m.description
         ORDER BY total_amount DESC, req_count DESC
         LIMIT 20`,
        matParams,
      );
      topMaterials = matResult.map((r: any) => ({
        code: r.code || '',
        description: r.description || '',
        reqCount: Number(r.req_count),
        totalQuantity: Number(r.total_quantity),
        totalAmount: Number(r.total_amount),
      }));
    }

    // Materiales más pedidos por mes: mismas reglas de filtro, agrupado además por mes de
    // creación de la requisición. El frontend pivota y arma las series del Top de materiales.
    let topMaterialsByMonth: { year: number; month: number; code: string; description: string; reqCount: number; totalQuantity: number; totalAmount: number }[] = [];
    if (requisitionIds.length > 0) {
      const monthParams: any[] = [requisitionIds];
      let monthFilterClause = '';
      if (filters?.materialCode) {
        monthParams.push(`%${filters.materialCode}%`);
        monthFilterClause = ' AND (m.code ILIKE $2 OR m.description ILIKE $2)';
      }
      const monthResult = await this.requisitionRepository.query(
        `SELECT EXTRACT(YEAR FROM r.created_at)::int AS year,
                EXTRACT(MONTH FROM r.created_at)::int AS month,
                m.code AS code, m.description AS description,
                COUNT(DISTINCT ri.requisition_id)::int AS req_count,
                COALESCE(SUM(ri.quantity), 0)::float AS total_quantity,
                COALESCE(SUM(poi.total_amount), 0)::float AS total_amount
         FROM requisition_items ri
         JOIN materials m ON m.material_id = ri.material_id
         JOIN requisitions r ON r.requisition_id = ri.requisition_id
         LEFT JOIN purchase_order_items poi ON poi.requisition_item_id = ri.item_id
         WHERE ri.requisition_id = ANY($1::int[])${monthFilterClause}
         GROUP BY year, month, m.code, m.description
         ORDER BY year, month`,
        monthParams,
      );
      topMaterialsByMonth = monthResult.map((r: any) => ({
        year: r.year,
        month: r.month,
        code: r.code || '',
        description: r.description || '',
        reqCount: Number(r.req_count),
        totalQuantity: Number(r.total_quantity),
        totalAmount: Number(r.total_amount),
      }));
    }

    return {
      actions,
      rows,
      totalPurchaseOrders,
      purchaseOrdersByMonth,
      totalVoidedRequisitions,
      voidedRequisitionsByMonth,
      purchaseOrderValueByMonth,
      invoiceValueByMonth,
      totalPurchaseOrderValue,
      totalInvoiceValue,
      topMaterials,
      topMaterialsByMonth,
    };
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
