import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RequisitionLog } from "../../database/entities/requisition-log.entity";
import { Requisition } from "../../database/entities/requisition.entity";
import { PurchaseOrder } from "../../database/entities/purchase-order.entity";
import { areaDeRol } from "./areas.constants";
import { COLOMBIA_HOLIDAY_DATES } from "../../utils/business-days.util";

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
    /**
     * Filtra por el cargo de quien creó la requisición.
     *
     * Es lo que usa el selector de «Persona» de la pantalla de gráficos, que
     * muestra cargos y no nombres. Va aparte de `requesterName` —y no lo
     * reemplaza— porque el nombre no siempre identifica a alguien: hay dos
     * usuarias «Estefania Serna», una en PQRS Tarso y otra en PQRS Pueblorrico,
     * y filtrar por nombre las mezcla.
     */
    requesterCargo?: string;
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
      // Evento sintético: no sale de `requisition_logs` sino de la fecha en que
      // la factura se envió a contabilidad. Se añade a los eventos más abajo, y
      // por eso las columnas se calculan DESPUÉS de ese paso.
      'factura_contabilidad',
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
      .leftJoin('requisition.creator', 'creator')
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
    if (filters?.requesterName) {
      qb.andWhere('creator.nombre ILIKE :requesterName', {
        requesterName: `%${filters.requesterName}%`,
      });
    }
    if (filters?.requesterCargo) {
      // Coincidencia exacta (sin comodines): el cargo viene elegido de una lista,
      // no escrito a mano, y con `%…%` un «Contador» arrastraría también al
      // «Contador de costos».
      qb.andWhere('btrim(lower(creator.cargo)) = btrim(lower(:requesterCargo))', {
        requesterCargo: filters.requesterCargo,
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

    const rows = Array.from(map.values())
      .sort((a, b) => new Date(a.minDate).getTime() - new Date(b.minDate).getTime())
      .map(({ minDate, ...rest }) => rest);

    const requisitionIds = Array.from(map.keys());

    // Cuándo se entregó la factura a contabilidad (la última, por requisición). Se
    // adjunta como evento sintético 'factura_contabilidad' para poder medir tiempos.
    //
    // Se usa `updated_at` —el instante en que el sistema registró el envío— y NO
    // `sent_to_accounting_date`, que la escribe a mano quien envía y por eso puede
    // decir cualquier cosa: en las 274 facturas enviadas no coincide ni una sola
    // vez con el día real. La matriz es un registro de auditoría, así que muestra
    // lo que pasó, no lo que alguien tecleó que pasó.
    //
    // Limitación conocida: `updated_at` se mueve si la fila se vuelve a escribir,
    // y contabilidad la escribe al recibirla. En las facturas ya recibidas esta
    // fecha es la de recepción, no la del envío. Guardar el instante exacto
    // exigiría una columna propia (`sent_to_accounting_at`), que no existe.
    if (requisitionIds.length > 0) {
      const sentResult = await this.purchaseOrderRepository.query(
        `SELECT po.requisition_id AS requisition_id,
                MAX(i.updated_at)::text AS sent_date
         FROM invoices i
         JOIN purchase_orders po ON po.purchase_order_id = i.purchase_order_id
         WHERE po.requisition_id = ANY($1::int[])
           AND i.sent_to_accounting = true
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

    // Las columnas se calculan aquí y no antes: `factura_contabilidad` se acaba
    // de añadir a los eventos, y calculándolas arriba esa columna nunca llegaba
    // a existir aunque la fecha sí estuviera en cada fila.
    const presentActions = new Set<string>();
    for (const row of rows) {
      Object.keys(row.events).forEach((a) => presentActions.add(a));
    }
    const actions = ACTION_ORDER.filter((a) => presentActions.has(a));

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

      // Una requisición queda anulada por dos caminos, y ambos cuentan:
      //   · el PMO la anula de una vez            → 'anular_requisicion'
      //   · Compras lo solicita y la Directora
      //     Financiera lo aprueba                 → 'aprobar_anulacion'
      // Mirar solo el primero dejaba fuera 12 de las 14 anulaciones, porque el
      // segundo es el camino habitual. `solicitar_anulacion` NO entra: es una
      // petición que todavía puede rechazarse.
      const ACCIONES_ANULACION = ['anular_requisicion', 'aprobar_anulacion'];

      const voidedResult = await this.requisitionLogRepository.query(
        `SELECT COUNT(DISTINCT requisition_id)::int AS count
         FROM requisition_logs
         WHERE requisition_id = ANY($1::int[])
           AND action = ANY($2)`,
        [requisitionIds, ACCIONES_ANULACION],
      );
      totalVoidedRequisitions = parseInt(voidedResult[0]?.count ?? '0');

      // Se agrupa por la ÚLTIMA anulación de cada requisición, no por cada log:
      // si una llegara a tener las dos acciones en meses distintos, contarla en
      // ambos meses inflaría el total de la gráfica sobre el de la tarjeta.
      const voidedByMonthResult = await this.requisitionLogRepository.query(
        `SELECT EXTRACT(YEAR FROM anulada_en)::int  AS year,
                EXTRACT(MONTH FROM anulada_en)::int AS month,
                COUNT(*)::int                       AS count
         FROM (
           SELECT requisition_id, MAX(created_at) AS anulada_en
             FROM requisition_logs
            WHERE requisition_id = ANY($1::int[])
              AND action = ANY($2)
            GROUP BY requisition_id
         ) t
         GROUP BY year, month
         ORDER BY year, month`,
        [requisitionIds, ACCIONES_ANULACION],
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
      // Se agrupa por `issue_date` —la fecha de emisión de la orden— y no por
      // `created_at`, que es cuándo se creó la fila. La gráfica habla de órdenes
      // «emitidas» y la factura del proveedor se compara contra esa fecha, no
      // contra la de captura. Las dos difieren de día en las 298 órdenes y de
      // mes en 7, que hasta ahora aparecían en el mes que no era.
      const poValueResult = await this.purchaseOrderRepository.query(
        `SELECT EXTRACT(YEAR FROM COALESCE(issue_date, created_at))::int  AS year,
                EXTRACT(MONTH FROM COALESCE(issue_date, created_at))::int AS month,
                COALESCE(SUM(total_amount), 0)::float                     AS value
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

    /**
     * Qué área compra más.
     *
     * El área sale del rol de quien creó la requisición —la base no la guarda—,
     * y el valor de las órdenes que salieron de esas requisiciones. Se cuentan
     * las dos cosas porque no dicen lo mismo: PQRS levanta muchas requisiciones
     * pequeñas y Proyectos pocas y grandes, y «compra más» significa una cosa u
     * otra según cuál se mire.
     *
     * El valor va por LATERAL: una requisición puede tener varias órdenes, y
     * unirlas de plano multiplicaría el conteo de requisiciones.
     */
    let purchasesByArea: {
      area: string;
      requisitions: number;
      amount: number;
    }[] = [];
    if (requisitionIds.length > 0) {
      const porRol = await this.requisitionRepository.query(
        `SELECT u.rol_id                        AS "rolId",
                COUNT(*)::int                   AS "requisitions",
                COALESCE(SUM(oc.valor), 0)::float AS "amount"
           FROM requisitions r
           LEFT JOIN users u ON u.user_id = r.created_by
           LEFT JOIN LATERAL (
                  SELECT COALESCE(SUM(po.total_amount), 0) AS valor
                    FROM purchase_orders po
                   WHERE po.requisition_id = r.requisition_id
                ) oc ON true
          WHERE r.requisition_id = ANY($1::int[])
          GROUP BY u.rol_id`,
        [requisitionIds],
      );

      const acumulado = new Map<string, { requisitions: number; amount: number }>();
      for (const fila of porRol) {
        const area = areaDeRol(fila.rolId == null ? null : Number(fila.rolId));
        const previo = acumulado.get(area) ?? { requisitions: 0, amount: 0 };
        previo.requisitions += Number(fila.requisitions);
        previo.amount += Number(fila.amount);
        acumulado.set(area, previo);
      }
      purchasesByArea = [...acumulado.entries()]
        .map(([area, v]) => ({ area, ...v }))
        .sort((a, b) => b.amount - a.amount || b.requisitions - a.requisitions);
    }

    /**
     * Órdenes emitidas a las que les falta facturación.
     *
     * Entran las que no tienen ninguna factura y también las facturadas a
     * medias: en las dos hay dinero comprometido que el proveedor todavía no ha
     * cobrado, y separarlas dejaría las parciales sin aparecer en ninguna
     * pantalla.
     *
     * Se resuelve contra la tabla `invoices` y no contra el resumen que llevan
     * `purchase_orders.invoice_status` y `total_invoiced_amount`: esas columnas
     * hay que mantenerlas al día a mano y, si se desincronizan, la pantalla
     * daría por facturado algo que no lo está. Hoy concuerdan en las 275
     * órdenes, pero la comprobación no debe depender de que siga siendo así.
     *
     * Quedan fuera las órdenes de requisiciones anuladas: esas no se van a
     * facturar nunca, así que contarlas como pendientes infla la cifra con
     * dinero que ya nadie espera cobrar.
     *
     * Y el margen es de mil pesos, no de uno: los importes llevan decimales
     * —hay una orden de 83.338,08 facturada en 83.337, con 1,08 de diferencia—
     * y con un margen más estrecho se cuelan filas de «$1» que son redondeo del
     * IVA, no facturación pendiente.
     */
    let ordersPendingInvoice: {
      purchaseOrderNumber: string;
      supplierName: string;
      issueDate: string | null;
      days: number;
      totalAmount: number;
      invoicedAmount: number;
      pendingAmount: number;
      requisitionNumber: string | null;
      companyName: string | null;
    }[] = [];
    if (requisitionIds.length > 0) {
      const pendientes = await this.purchaseOrderRepository.query(
        `SELECT po.purchase_order_number                       AS "purchaseOrderNumber",
                s.name                                         AS "supplierName",
                po.issue_date                                  AS "issueDate",
                (CURRENT_DATE - COALESCE(po.issue_date, po.created_at)::date)::int AS "days",
                po.total_amount::float                         AS "totalAmount",
                COALESCE(f.facturado, 0)::float                AS "invoicedAmount",
                (po.total_amount - COALESCE(f.facturado, 0))::float AS "pendingAmount",
                r.requisition_number                           AS "requisitionNumber",
                COALESCE(p.name, c.name)                       AS "companyName"
           FROM purchase_orders po
           LEFT JOIN LATERAL (
                  SELECT SUM(i.amount) AS facturado
                    FROM invoices i
                   WHERE i.purchase_order_id = po.purchase_order_id
                ) f ON true
           LEFT JOIN suppliers s  ON s.supplier_id = po.supplier_id
           LEFT JOIN requisitions r ON r.requisition_id = po.requisition_id
           LEFT JOIN requisition_statuses rs ON rs.status_id = r.status_id
           LEFT JOIN companies c  ON c.company_id = r.company_id
           LEFT JOIN projects p   ON p.project_id = r.project_id
          WHERE po.requisition_id = ANY($1::int[])
            AND COALESCE(rs.code, '') NOT IN ('anulada', 'pendiente_anulacion')
            AND COALESCE(f.facturado, 0) < po.total_amount - 1000
          ORDER BY COALESCE(po.issue_date, po.created_at) ASC`,
        [requisitionIds],
      );
      ordersPendingInvoice = pendientes.map((r: Record<string, unknown>) => ({
        purchaseOrderNumber: String(r.purchaseOrderNumber ?? ''),
        supplierName: String(r.supplierName ?? 'Sin proveedor'),
        issueDate: (r.issueDate as string) ?? null,
        days: Number(r.days ?? 0),
        totalAmount: Number(r.totalAmount ?? 0),
        invoicedAmount: Number(r.invoicedAmount ?? 0),
        pendingAmount: Number(r.pendingAmount ?? 0),
        requisitionNumber: (r.requisitionNumber as string) ?? null,
        companyName: (r.companyName as string) ?? null,
      }));
    }

    /**
     * A qué proveedores se les compró, cuánto y cuánto han facturado.
     *
     * El valor sale de `purchase_orders.total_amount` y NO de la suma de los
     * ítems: el total de la orden incluye `other_value` —fletes y conceptos que
     * no son línea de material, unos 20 millones en total— y es la misma cifra
     * con la que está hecha la gráfica de órdenes por mes. Sumar ítems daría un
     * número menor y las dos gráficas se contradirían.
     *
     * Lo facturado va por LATERAL y no por JOIN: una orden puede tener varias
     * facturas, y unirlas de plano multiplicaría su `total_amount` por el número
     * de facturas.
     */
    let topSuppliers: {
      supplierId: number;
      name: string;
      nit: string | null;
      orderCount: number;
      totalAmount: number;
      invoicedAmount: number;
    }[] = [];
    if (requisitionIds.length > 0) {
      const supResult = await this.purchaseOrderRepository.query(
        `SELECT s.supplier_id                          AS "supplierId",
                s.name                                 AS "name",
                s.nit_cc                               AS "nit",
                COUNT(*)::int                          AS "orderCount",
                COALESCE(SUM(po.total_amount), 0)::float AS "totalAmount",
                COALESCE(SUM(f.facturado), 0)::float     AS "invoicedAmount"
           FROM purchase_orders po
           JOIN suppliers s ON s.supplier_id = po.supplier_id
           LEFT JOIN LATERAL (
                  SELECT SUM(i.amount) AS facturado
                    FROM invoices i
                   WHERE i.purchase_order_id = po.purchase_order_id
                ) f ON true
          WHERE po.requisition_id = ANY($1::int[])
          GROUP BY s.supplier_id, s.name, s.nit_cc
          ORDER BY SUM(po.total_amount) DESC`,
        [requisitionIds],
      );
      topSuppliers = supResult.map((r: Record<string, unknown>) => ({
        supplierId: Number(r.supplierId),
        name: String(r.name ?? 'Sin proveedor'),
        nit: (r.nit as string) ?? null,
        orderCount: Number(r.orderCount),
        totalAmount: Number(r.totalAmount),
        invoicedAmount: Number(r.invoicedAmount),
      }));
    }

    // Materiales más pedidos: por número de requisiciones que lo incluyen y cantidad total.
    // Si hay filtro de material, solo se cuentan los materiales que coinciden (no todos los
    // de la requisición), para que el gráfico no muestre los demás ítems del mismo pedido.
    // El filtro de persona ya viene aplicado en requisitionIds (afecta a todos los gráficos).
    let topMaterials: { code: string; description: string; reqCount: number; totalQuantity: number; totalAmount: number }[] = [];
    if (requisitionIds.length > 0) {
      const matParams: any[] = [requisitionIds];
      let matFilterClause = '';
      if (filters?.materialCode) {
        matParams.push(`%${filters.materialCode}%`);
        matFilterClause += ` AND (m.code ILIKE $${matParams.length} OR m.description ILIKE $${matParams.length})`;
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
      topSuppliers,
      ordersPendingInvoice,
      purchasesByArea,
      // Para que la matriz descuente los festivos al medir cuánto tardó cada
      // paso. Van desde aquí y no en una copia del frontend: la lista es una
      // sola y tiene que serlo.
      holidays: COLOMBIA_HOLIDAY_DATES,
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

  /**
   * Control de compra de materiales: una fila por ítem de orden de compra, con su
   * factura si ya la tiene. Replica el formato del Excel de control de luminarias.
   *
   * El municipio sale de dos lados según la región: en Antioquia es un proyecto de
   * Canales & Contactos, mientras que en Valle y Quindío va dentro del nombre de la
   * unión temporal. Se resuelve el primero aquí y el segundo en el front, que ya
   * tiene el mapeo de nombres oficiales.
   */
  async getMaterialsPurchaseControl(filters?: {
    groupId?: number;
    year?: number;
    onlyInvoiced?: boolean;
  }) {
    const condiciones: string[] = [];
    const params: unknown[] = [];

    if (filters?.groupId) {
      params.push(filters.groupId);
      condiciones.push(`g.group_id = $${params.length}`);
    }
    if (filters?.year) {
      params.push(filters.year);
      condiciones.push(
        `EXTRACT(YEAR FROM COALESCE(i.issue_date, po.issue_date)) = $${params.length}`,
      );
    }
    if (filters?.onlyInvoiced) {
      condiciones.push("i.invoice_id IS NOT NULL");
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

    const rows = await this.purchaseOrderRepository.manager.query(
      `SELECT poi.po_item_id            AS "poItemId",
              p.name                    AS "projectName",
              co.name                   AS "companyName",
              po.purchase_order_number  AS "purchaseOrderNumber",
              i.issue_date              AS "invoiceDate",
              i.invoice_number          AS "invoiceNumber",
              m.code                    AS "materialCode",
              m.description             AS "materialDescription",
              g.name                    AS "groupName",
              poi.quantity              AS "quantity",
              r.obra                    AS "tipoObra",
              r.requisition_number      AS "requisitionNumber",
              po.issue_date             AS "orderDate"
         FROM purchase_order_items poi
         JOIN purchase_orders po    ON po.purchase_order_id = poi.purchase_order_id
         JOIN requisitions r        ON r.requisition_id = po.requisition_id
         JOIN requisition_items ri  ON ri.item_id = poi.requisition_item_id
         JOIN materials m           ON m.material_id = ri.material_id
         JOIN material_groups g     ON g.group_id = m.group_id
         LEFT JOIN companies co     ON co.company_id = r.company_id
         LEFT JOIN projects p       ON p.project_id = r.project_id
         LEFT JOIN invoices i       ON i.purchase_order_id = po.purchase_order_id
         ${where}
        ORDER BY COALESCE(i.issue_date, po.issue_date) DESC, po.purchase_order_number, m.description`,
      params,
    );

    // Para poblar los selectores sin una segunda llamada.
    const groups = await this.purchaseOrderRepository.manager.query(
      `SELECT g.group_id AS "groupId", g.name AS "name"
         FROM material_groups g ORDER BY g.name`,
    );
    const years = await this.purchaseOrderRepository.manager.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(i.issue_date, po.issue_date))::int AS "year"
         FROM purchase_orders po
         LEFT JOIN invoices i ON i.purchase_order_id = po.purchase_order_id
        WHERE COALESCE(i.issue_date, po.issue_date) IS NOT NULL
        ORDER BY 1 DESC`,
    );

    return {
      data: rows.map((row: Record<string, unknown>) => ({
        ...row,
        quantity: Number(row.quantity),
      })),
      total: rows.length,
      groups,
      years: years.map((y: { year: number }) => y.year),
    };
  }

  /**
   * Compras por proveedor: qué materiales se le han comprado a cada proveedor y
   * la fecha de la orden de compra. Alimenta la pestaña "Proveedores" de
   * Auditorías. Se puede filtrar por proveedor y por año de la orden.
   */
  async getSupplierPurchases(filters?: { supplierId?: number; year?: number }) {
    const condiciones: string[] = [];
    const params: unknown[] = [];

    if (filters?.supplierId) {
      params.push(filters.supplierId);
      condiciones.push(`s.supplier_id = $${params.length}`);
    }
    if (filters?.year) {
      params.push(filters.year);
      condiciones.push(`EXTRACT(YEAR FROM po.issue_date) = $${params.length}`);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

    const rows = await this.purchaseOrderRepository.manager.query(
      `SELECT poi.po_item_id            AS "poItemId",
              s.supplier_id             AS "supplierId",
              s.name                    AS "supplierName",
              s.nit_cc                  AS "supplierNit",
              m.code                    AS "materialCode",
              m.description             AS "materialDescription",
              g.name                    AS "groupName",
              poi.quantity              AS "quantity",
              poi.unit_price            AS "unitPrice",
              poi.total_amount          AS "totalAmount",
              po.purchase_order_number  AS "purchaseOrderNumber",
              po.issue_date             AS "orderDate",
              co.name                   AS "companyName",
              p.name                    AS "projectName"
         FROM purchase_order_items poi
         JOIN purchase_orders po    ON po.purchase_order_id = poi.purchase_order_id
         JOIN suppliers s           ON s.supplier_id = po.supplier_id
         JOIN requisitions r        ON r.requisition_id = po.requisition_id
         JOIN requisition_items ri  ON ri.item_id = poi.requisition_item_id
         JOIN materials m           ON m.material_id = ri.material_id
         JOIN material_groups g     ON g.group_id = m.group_id
         LEFT JOIN companies co     ON co.company_id = r.company_id
         LEFT JOIN projects p       ON p.project_id = r.project_id
         ${where}
        ORDER BY s.name, po.issue_date DESC, po.purchase_order_number, m.description`,
      params,
    );

    // Selectores sin una segunda llamada.
    const suppliers = await this.purchaseOrderRepository.manager.query(
      `SELECT DISTINCT s.supplier_id AS "supplierId", s.name AS "name", s.nit_cc AS "nit"
         FROM suppliers s
         JOIN purchase_orders po ON po.supplier_id = s.supplier_id
        ORDER BY s.name`,
    );
    const years = await this.purchaseOrderRepository.manager.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM po.issue_date)::int AS "year"
         FROM purchase_orders po
        WHERE po.issue_date IS NOT NULL
        ORDER BY 1 DESC`,
    );

    return {
      data: rows.map((row: Record<string, unknown>) => ({
        ...row,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
        totalAmount: Number(row.totalAmount),
      })),
      total: rows.length,
      suppliers,
      years: years.map((y: { year: number }) => y.year),
    };
  }
}
