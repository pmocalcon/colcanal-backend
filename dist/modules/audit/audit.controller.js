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
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("./audit.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let AuditController = class AuditController {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    async getAuditLogs(page, limit, userId, action, requisitionId, fromDate, toDate) {
        const pageNum = page ? parseInt(page) : 1;
        const limitNum = limit ? parseInt(limit) : 50;
        const filters = {};
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
    async getRequisitionDetail(id) {
        return this.auditService.getRequisitionDetail(id);
    }
    async getAuditStats() {
        return this.auditService.getAuditStats();
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)('logs'),
    (0, swagger_1.ApiOperation)({
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
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        description: 'Número de página (default: 1)',
        type: Number,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        description: 'Registros por página (default: 50)',
        type: Number,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'userId',
        required: false,
        description: 'Filtrar por ID de usuario',
        type: Number,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'action',
        required: false,
        description: 'Filtrar por tipo de acción',
        type: String,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'requisitionId',
        required: false,
        description: 'Filtrar por ID de requisición',
        type: Number,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'fromDate',
        required: false,
        description: 'Fecha inicial (YYYY-MM-DD)',
        type: String,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'toDate',
        required: false,
        description: 'Fecha final (YYYY-MM-DD)',
        type: String,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de logs de auditoría obtenida exitosamente',
    }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('userId')),
    __param(3, (0, common_1.Query)('action')),
    __param(4, (0, common_1.Query)('requisitionId')),
    __param(5, (0, common_1.Query)('fromDate')),
    __param(6, (0, common_1.Query)('toDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('requisition/:id'),
    (0, swagger_1.ApiOperation)({
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
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Detalle de requisición obtenido exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getRequisitionDetail", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener estadísticas de auditoría',
        description: `
    Obtiene estadísticas generales de los logs de auditoría:

    - Total de logs registrados
    - Logs por tipo de acción
    - Logs de los últimos 7 días
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Estadísticas de auditoría obtenidas exitosamente',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getAuditStats", null);
exports.AuditController = AuditController = __decorate([
    (0, swagger_1.ApiTags)('Auditorías'),
    (0, common_1.Controller)('audit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditController);
//# sourceMappingURL=audit.controller.js.map