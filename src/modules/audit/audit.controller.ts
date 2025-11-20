import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Auditorías')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({
    summary: 'Obtener todos los logs de auditoría del módulo de compras',
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
    name: 'page',
    required: false,
    description: 'Número de página (default: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Registros por página (default: 50)',
    type: Number,
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filtrar por ID de usuario',
    type: Number,
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filtrar por tipo de acción',
    type: String,
  })
  @ApiQuery({
    name: 'requisitionId',
    required: false,
    description: 'Filtrar por ID de requisición',
    type: Number,
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Fecha inicial (YYYY-MM-DD)',
    type: String,
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'Fecha final (YYYY-MM-DD)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs de auditoría obtenida exitosamente',
  })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('requisitionId') requisitionId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 50;

    const filters: any = {};

    if (userId) {
      filters.userId = parseInt(userId);
    }

    if (action) {
      filters.action = action;
    }

    if (requisitionId) {
      filters.requisitionId = parseInt(requisitionId);
    }

    if (fromDate) {
      filters.fromDate = fromDate;
    }

    if (toDate) {
      filters.toDate = toDate;
    }

    return this.auditService.getAuditLogs(pageNum, limitNum, filters);
  }

  @Get('requisition/:id')
  @ApiOperation({
    summary: 'Obtener detalle completo de una requisición para auditoría',
    description: `
    Obtiene información detallada de una requisición específica incluyendo:

    - Información general de la requisición
    - Todos los ítems con materiales y cantidades
    - Cotizaciones de proveedores
    - Órdenes de compra generadas
    - Timeline completo de acciones con tiempos entre cada acción
    - Montos totales (subtotal, IVA, total)
    - Historial de aprobaciones
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de requisición obtenido exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Requisición no encontrada',
  })
  async getRequisitionDetail(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.getRequisitionDetail(id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de auditoría',
    description: `
    Obtiene estadísticas generales de los logs de auditoría:

    - Total de logs registrados
    - Logs por tipo de acción
    - Logs de los últimos 7 días
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de auditoría obtenidas exitosamente',
  })
  async getAuditStats() {
    return this.auditService.getAuditStats();
  }
}
