import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from "@nestjs/swagger";

@ApiTags("Auditorías")
@Controller("audit")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("logs")
  @ApiOperation({
    summary: "Obtener todos los logs de auditoría del módulo de compras",
    description: `
    Obtiene un listado paginado de todos los logs de auditoría del módulo de compras.

    ## Información mostrada

    - Fecha y hora de la acción
    - Usuario que realizó la acción
    - Acción realizada
    - Requisición afectada
    - Estados anterior y nuevo
    - Comentarios

    ## Filtros opcionales

    - **userId**: Filtrar por usuario específico
    - **action**: Filtrar por tipo de acción
    - **requisitionId**: Filtrar por requisición específica
    - **fromDate / toDate**: Filtrar por rango de fechas
    - **page / limit**: Paginación
    `,
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Número de página (default: 1)",
    type: Number,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Registros por página (default: 50)",
    type: Number,
  })
  @ApiQuery({
    name: "userId",
    required: false,
    description: "Filtrar por ID de usuario",
    type: Number,
  })
  @ApiQuery({
    name: "action",
    required: false,
    description: "Filtrar por tipo de acción",
    type: String,
  })
  @ApiQuery({
    name: "requisitionId",
    required: false,
    description: "Filtrar por ID de requisición",
    type: Number,
  })
  @ApiQuery({
    name: "requisitionNumber",
    required: false,
    description: "Filtrar por número de requisición (búsqueda parcial)",
    type: String,
  })
  @ApiQuery({
    name: "companyName",
    required: false,
    description: "Filtrar por nombre de empresa/proyecto (búsqueda parcial)",
    type: String,
  })
  @ApiQuery({
    name: "userName",
    required: false,
    description: "Filtrar por nombre de usuario (búsqueda parcial)",
    type: String,
  })
  @ApiQuery({
    name: "fromDate",
    required: false,
    description: "Fecha inicial (YYYY-MM-DD)",
    type: String,
  })
  @ApiQuery({
    name: "toDate",
    required: false,
    description: "Fecha final (YYYY-MM-DD)",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Lista de logs de auditoría obtenida exitosamente",
  })
  async getAuditLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("userId") userId?: string,
    @Query("action") action?: string,
    @Query("requisitionId") requisitionId?: string,
    @Query("requisitionNumber") requisitionNumber?: string,
    @Query("companyName") companyName?: string,
    @Query("userName") userName?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 50;

    const filters: any = {};

    if (userId) filters.userId = parseInt(userId);
    if (action) filters.action = action;
    if (requisitionId) filters.requisitionId = parseInt(requisitionId);
    if (requisitionNumber) filters.requisitionNumber = requisitionNumber;
    if (companyName) filters.companyName = companyName;
    if (userName) filters.userName = userName;
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;

    return this.auditService.getAuditLogs(pageNum, limitNum, filters);
  }

  @Get("matrix")
  @ApiOperation({ summary: "Obtener matriz de estados de requisiciones" })
  async getMatrix(
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("requisitionNumber") requisitionNumber?: string,
    @Query("companyName") companyName?: string,
    @Query("materialCode") materialCode?: string,
    @Query("requesterName") requesterName?: string,
    @Query("requesterCargo") requesterCargo?: string,
  ) {
    return this.auditService.getMatrix({
      fromDate,
      toDate,
      requisitionNumber,
      companyName,
      materialCode,
      requesterName,
      requesterCargo,
    });
  }

  @Get("requisition/:id")
  @ApiOperation({
    summary: "Obtener detalle completo de una requisición para auditoría",
    description: `
    Obtiene información detallada de una requisición específica incluyendo:

    - Información general de la requisición
    - Todos los ítems con materiales y cantidades
    - Cotizaciones de proveedores
    - Órdenes de compra generadas
    - Timeline completo de acciones (el tiempo entre una y otra lo calcula el
      frontend en días hábiles, con los festivos que devuelve este mismo endpoint)
    - Montos totales (subtotal, IVA, total)
    - Historial de aprobaciones
    `,
  })
  @ApiResponse({
    status: 200,
    description: "Detalle de requisición obtenido exitosamente",
  })
  @ApiResponse({
    status: 404,
    description: "Requisición no encontrada",
  })
  async getRequisitionDetail(@Param("id", ParseIntPipe) id: number) {
    return this.auditService.getRequisitionDetail(id);
  }

  @Get("requisition/:id/purchase-orders")
  @ApiOperation({
    summary: "Órdenes de compra de una requisición",
    description: `
    Las órdenes de compra de una requisición con su valor, lo facturado, la
    diferencia, la fecha de emisión y los días transcurridos desde entonces.

    Alimenta el desglose que se abre en la pestaña de Registros. Se pide por
    requisición y no de una vez para toda la página porque solo se abre una a la
    vez: traerlas todas cargaría decenas de consultas que casi nadie mira.
    `,
  })
  @ApiResponse({ status: 200, description: "Listado obtenido exitosamente" })
  async getRequisitionPurchaseOrders(@Param("id", ParseIntPipe) id: number) {
    return this.auditService.getRequisitionPurchaseOrders(id);
  }

  @Get("stats")
  @ApiOperation({
    summary: "Obtener estadísticas de auditoría",
    description: `
    Obtiene estadísticas generales de los logs de auditoría:

    - Total de logs registrados
    - Logs por tipo de acción
    - Logs de los últimos 7 días
    `,
  })
  @ApiResponse({
    status: 200,
    description: "Estadísticas de auditoría obtenidas exitosamente",
  })
  async getAuditStats() {
    return this.auditService.getAuditStats();
  }

  @Get("materials-purchase-control")
  @ApiOperation({
    summary: "Control de compra de materiales",
    description: `
    Devuelve una fila por ítem de orden de compra, con la factura asociada si ya existe.
    Pensado para el control de compra de luminarias y proyectores, pero sirve para
    cualquier grupo de material.

    Incluye además los grupos de material y los años disponibles, para poblar los filtros.
    `,
  })
  @ApiQuery({ name: "groupId", required: false, type: Number })
  @ApiQuery({ name: "year", required: false, type: Number })
  @ApiQuery({ name: "onlyInvoiced", required: false, type: Boolean })
  @ApiResponse({ status: 200, description: "Listado obtenido exitosamente" })
  async getMaterialsPurchaseControl(
    @Query("groupId") groupId?: string,
    @Query("year") year?: string,
    @Query("onlyInvoiced") onlyInvoiced?: string,
  ) {
    return this.auditService.getMaterialsPurchaseControl({
      groupId: groupId ? parseInt(groupId, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
      onlyInvoiced: onlyInvoiced === "true",
    });
  }

  @Get("supplier-purchases")
  @ApiOperation({
    summary: "Compras por proveedor",
    description: `
    Devuelve una fila por ítem de orden de compra con el proveedor, el material,
    la cantidad, el valor y la fecha de la orden. Sirve para ver qué se le ha
    comprado a cada proveedor.

    Incluye los proveedores y los años disponibles, para poblar los filtros.
    `,
  })
  @ApiQuery({ name: "supplierId", required: false, type: Number })
  @ApiQuery({ name: "year", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Listado obtenido exitosamente" })
  async getSupplierPurchases(
    @Query("supplierId") supplierId?: string,
    @Query("year") year?: string,
  ) {
    return this.auditService.getSupplierPurchases({
      supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
  }
}
