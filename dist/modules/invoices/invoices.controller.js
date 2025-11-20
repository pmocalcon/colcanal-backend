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
exports.InvoicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const get_user_decorator_1 = require("../../common/decorators/get-user.decorator");
const invoices_service_1 = require("./invoices.service");
const create_invoice_dto_1 = require("./dto/create-invoice.dto");
const update_invoice_dto_1 = require("./dto/update-invoice.dto");
const send_to_accounting_dto_1 = require("./dto/send-to-accounting.dto");
const user_entity_1 = require("../../database/entities/user.entity");
let InvoicesController = class InvoicesController {
    invoicesService;
    constructor(invoicesService) {
        this.invoicesService = invoicesService;
    }
    async getPurchaseOrdersForInvoicing(page = 1, limit = 10) {
        return this.invoicesService.getPurchaseOrdersForInvoicing(page, limit);
    }
    async getInvoicesByPurchaseOrder(purchaseOrderId) {
        return this.invoicesService.getInvoicesByPurchaseOrder(purchaseOrderId);
    }
    async create(user, createInvoiceDto) {
        return this.invoicesService.create(user.userId, createInvoiceDto);
    }
    async update(id, updateInvoiceDto) {
        return this.invoicesService.update(id, updateInvoiceDto);
    }
    async remove(id) {
        return this.invoicesService.remove(id);
    }
    async sendToAccounting(purchaseOrderId, sendToAccountingDto) {
        return this.invoicesService.sendToAccounting(purchaseOrderId, sendToAccountingDto);
    }
};
exports.InvoicesController = InvoicesController;
__decorate([
    (0, common_1.Get)('purchase-orders/for-invoicing'),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar órdenes de compra para facturar',
        description: 'Obtiene un listado de órdenes de compra aprobadas que pueden ser facturadas',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista obtenida exitosamente' }),
    __param(0, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(1, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "getPurchaseOrdersForInvoicing", null);
__decorate([
    (0, common_1.Get)('by-purchase-order/:purchaseOrderId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener facturas de una orden de compra',
        description: 'Obtiene todas las facturas asociadas a una orden de compra',
    }),
    (0, swagger_1.ApiParam)({ name: 'purchaseOrderId', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Facturas obtenidas exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Orden de compra no encontrada' }),
    __param(0, (0, common_1.Param)('purchaseOrderId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "getInvoicesByPurchaseOrder", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Crear una factura',
        description: 'Registra una nueva factura para una orden de compra. Máximo 3 facturas por orden.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Factura creada exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Datos inválidos o límite de facturas excedido' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Orden de compra no encontrada' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        create_invoice_dto_1.CreateInvoiceDto]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Actualizar una factura',
        description: 'Actualiza los datos de una factura. No se puede editar si ya fue enviada a contabilidad.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Factura actualizada exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Datos inválidos' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Factura ya enviada a contabilidad' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Factura no encontrada' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_invoice_dto_1.UpdateInvoiceDto]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Eliminar una factura',
        description: 'Elimina una factura. No se puede eliminar si ya fue enviada a contabilidad.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Factura eliminada exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Factura ya enviada a contabilidad' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Factura no encontrada' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('send-to-accounting/:purchaseOrderId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Enviar facturas a contabilidad',
        description: 'Marca todas las facturas de una orden como enviadas a contabilidad. Solo si la suma de facturas = total de OC.',
    }),
    (0, swagger_1.ApiParam)({ name: 'purchaseOrderId', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Facturas enviadas exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Las facturas no completan el total de la orden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Orden de compra no encontrada' }),
    __param(0, (0, common_1.Param)('purchaseOrderId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, send_to_accounting_dto_1.SendToAccountingDto]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "sendToAccounting", null);
exports.InvoicesController = InvoicesController = __decorate([
    (0, swagger_1.ApiTags)('Invoices - Facturas'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('invoices'),
    __metadata("design:paramtypes", [invoices_service_1.InvoicesService])
], InvoicesController);
//# sourceMappingURL=invoices.controller.js.map