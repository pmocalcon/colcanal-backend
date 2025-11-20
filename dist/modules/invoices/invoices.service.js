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
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const invoice_entity_1 = require("../../database/entities/invoice.entity");
const purchase_order_entity_1 = require("../../database/entities/purchase-order.entity");
let InvoicesService = class InvoicesService {
    invoiceRepository;
    purchaseOrderRepository;
    constructor(invoiceRepository, purchaseOrderRepository) {
        this.invoiceRepository = invoiceRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
    }
    async getInvoicesByPurchaseOrder(purchaseOrderId) {
        const purchaseOrder = await this.purchaseOrderRepository.findOne({
            where: { purchaseOrderId },
            relations: [
                'approvalStatus',
                'supplier',
                'requisition',
                'requisition.operationCenter',
                'requisition.operationCenter.company',
                'items',
                'items.requisitionItem',
                'items.requisitionItem.material',
            ],
        });
        if (!purchaseOrder) {
            throw new common_1.NotFoundException(`Orden de compra con ID ${purchaseOrderId} no encontrada`);
        }
        const invoices = await this.invoiceRepository.find({
            where: { purchaseOrderId },
            relations: ['creator'],
            order: { createdAt: 'DESC' },
        });
        const transformedItems = purchaseOrder.items?.map(item => ({
            purchaseOrderItemId: item.poItemId,
            materialId: item.requisitionItem?.material?.materialId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            iva: item.ivaAmount,
            total: item.totalAmount,
            material: item.requisitionItem?.material ? {
                materialId: item.requisitionItem.material.materialId,
                codigo: item.requisitionItem.material.code,
                descripcion: item.requisitionItem.material.description,
                unidadMedida: '-',
            } : null,
        }));
        return {
            purchaseOrder: {
                ...purchaseOrder,
                items: transformedItems,
            },
            invoices,
            summary: {
                totalInvoices: invoices.length,
                totalInvoicedAmount: purchaseOrder.totalInvoicedAmount,
                totalInvoicedQuantity: purchaseOrder.totalInvoicedQuantity,
                pendingAmount: Number(purchaseOrder.totalAmount) - Number(purchaseOrder.totalInvoicedAmount),
                invoiceStatus: purchaseOrder.invoiceStatus,
            },
        };
    }
    async getPurchaseOrdersForInvoicing(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [purchaseOrders, total] = await this.purchaseOrderRepository
            .createQueryBuilder('po')
            .leftJoinAndSelect('po.requisition', 'requisition')
            .leftJoinAndSelect('requisition.operationCenter', 'operationCenter')
            .leftJoinAndSelect('operationCenter.company', 'company')
            .leftJoinAndSelect('po.supplier', 'supplier')
            .leftJoinAndSelect('po.approvalStatus', 'approvalStatus')
            .leftJoinAndSelect('po.invoices', 'invoices')
            .where('approvalStatus.code = :status', { status: 'aprobada_gerencia' })
            .skip(skip)
            .take(limit)
            .orderBy('po.createdAt', 'DESC')
            .getManyAndCount();
        return {
            data: purchaseOrders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async create(userId, createInvoiceDto) {
        const { purchaseOrderId, invoiceNumber, issueDate, amount, materialQuantity } = createInvoiceDto;
        const purchaseOrder = await this.purchaseOrderRepository.findOne({
            where: { purchaseOrderId },
            relations: ['approvalStatus', 'invoices'],
        });
        if (!purchaseOrder) {
            throw new common_1.NotFoundException(`Orden de compra con ID ${purchaseOrderId} no encontrada`);
        }
        if (purchaseOrder.approvalStatus.code !== 'aprobada_gerencia') {
            throw new common_1.BadRequestException('Solo se pueden registrar facturas para órdenes de compra aprobadas por gerencia');
        }
        const existingInvoice = await this.invoiceRepository.findOne({
            where: { invoiceNumber },
        });
        if (existingInvoice) {
            throw new common_1.BadRequestException(`Ya existe una factura con el número ${invoiceNumber}`);
        }
        const invoiceCount = purchaseOrder.invoices?.length || 0;
        if (invoiceCount >= 3) {
            throw new common_1.BadRequestException('Una orden de compra no puede tener más de 3 facturas');
        }
        const currentInvoicedAmount = Number(purchaseOrder.totalInvoicedAmount) || 0;
        const currentInvoicedQuantity = Number(purchaseOrder.totalInvoicedQuantity) || 0;
        const newTotalAmount = currentInvoicedAmount + Number(amount);
        const newTotalQuantity = currentInvoicedQuantity + Number(materialQuantity);
        if (newTotalAmount > Number(purchaseOrder.totalAmount)) {
            throw new common_1.BadRequestException(`El monto total de las facturas ($${newTotalAmount}) excede el total de la orden de compra ($${purchaseOrder.totalAmount})`);
        }
        const invoice = this.invoiceRepository.create({
            purchaseOrderId,
            invoiceNumber,
            issueDate: new Date(issueDate),
            amount: Number(amount),
            materialQuantity: Number(materialQuantity),
            createdBy: userId,
        });
        const savedInvoice = await this.invoiceRepository.save(invoice);
        await this.updatePurchaseOrderInvoiceTotals(purchaseOrderId);
        return this.invoiceRepository.findOne({
            where: { invoiceId: savedInvoice.invoiceId },
            relations: ['creator', 'purchaseOrder'],
        });
    }
    async update(invoiceId, updateInvoiceDto) {
        const invoice = await this.invoiceRepository.findOne({
            where: { invoiceId },
            relations: ['purchaseOrder', 'purchaseOrder.invoices'],
        });
        if (!invoice) {
            throw new common_1.NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
        }
        if (invoice.sentToAccounting) {
            throw new common_1.ForbiddenException('No se puede editar una factura que ya fue enviada a contabilidad');
        }
        if (updateInvoiceDto.invoiceNumber && updateInvoiceDto.invoiceNumber !== invoice.invoiceNumber) {
            const existingInvoice = await this.invoiceRepository.findOne({
                where: { invoiceNumber: updateInvoiceDto.invoiceNumber },
            });
            if (existingInvoice) {
                throw new common_1.BadRequestException(`Ya existe una factura con el número ${updateInvoiceDto.invoiceNumber}`);
            }
        }
        if (updateInvoiceDto.amount !== undefined || updateInvoiceDto.materialQuantity !== undefined) {
            const newAmount = updateInvoiceDto.amount !== undefined ? Number(updateInvoiceDto.amount) : Number(invoice.amount);
            const newQuantity = updateInvoiceDto.materialQuantity !== undefined
                ? Number(updateInvoiceDto.materialQuantity)
                : Number(invoice.materialQuantity);
            const otherInvoicesAmount = invoice.purchaseOrder.invoices
                .filter(inv => inv.invoiceId !== invoiceId)
                .reduce((sum, inv) => sum + Number(inv.amount), 0);
            const otherInvoicesQuantity = invoice.purchaseOrder.invoices
                .filter(inv => inv.invoiceId !== invoiceId)
                .reduce((sum, inv) => sum + Number(inv.materialQuantity), 0);
            const totalAmount = otherInvoicesAmount + newAmount;
            const totalQuantity = otherInvoicesQuantity + newQuantity;
            if (totalAmount > Number(invoice.purchaseOrder.totalAmount)) {
                throw new common_1.BadRequestException(`El monto total de las facturas ($${totalAmount}) excede el total de la orden de compra ($${invoice.purchaseOrder.totalAmount})`);
            }
        }
        Object.assign(invoice, updateInvoiceDto);
        if (updateInvoiceDto.issueDate) {
            invoice.issueDate = new Date(updateInvoiceDto.issueDate);
        }
        const updatedInvoice = await this.invoiceRepository.save(invoice);
        await this.updatePurchaseOrderInvoiceTotals(invoice.purchaseOrderId);
        return this.invoiceRepository.findOne({
            where: { invoiceId: updatedInvoice.invoiceId },
            relations: ['creator', 'purchaseOrder'],
        });
    }
    async remove(invoiceId) {
        const invoice = await this.invoiceRepository.findOne({
            where: { invoiceId },
        });
        if (!invoice) {
            throw new common_1.NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
        }
        if (invoice.sentToAccounting) {
            throw new common_1.ForbiddenException('No se puede eliminar una factura que ya fue enviada a contabilidad');
        }
        const purchaseOrderId = invoice.purchaseOrderId;
        await this.invoiceRepository.remove(invoice);
        await this.updatePurchaseOrderInvoiceTotals(purchaseOrderId);
        return { message: 'Factura eliminada exitosamente' };
    }
    async sendToAccounting(purchaseOrderId, sendToAccountingDto) {
        const purchaseOrder = await this.purchaseOrderRepository.findOne({
            where: { purchaseOrderId },
            relations: ['invoices'],
        });
        if (!purchaseOrder) {
            throw new common_1.NotFoundException(`Orden de compra con ID ${purchaseOrderId} no encontrada`);
        }
        if (!purchaseOrder.invoices || purchaseOrder.invoices.length === 0) {
            throw new common_1.BadRequestException('La orden de compra no tiene facturas registradas');
        }
        if (purchaseOrder.invoiceStatus !== 'factura_completa') {
            throw new common_1.BadRequestException('La suma de las facturas debe ser igual al total de la orden de compra para enviar a contabilidad');
        }
        const sentDate = new Date(sendToAccountingDto.sentToAccountingDate);
        for (const invoice of purchaseOrder.invoices) {
            invoice.sentToAccounting = true;
            invoice.sentToAccountingDate = sentDate;
            await this.invoiceRepository.save(invoice);
        }
        purchaseOrder.invoiceStatus = 'enviada_contabilidad';
        await this.purchaseOrderRepository.save(purchaseOrder);
        return {
            message: 'Facturas enviadas a contabilidad exitosamente',
            sentDate: sentDate.toISOString().split('T')[0],
            invoicesCount: purchaseOrder.invoices.length,
        };
    }
    async updatePurchaseOrderInvoiceTotals(purchaseOrderId) {
        const purchaseOrder = await this.purchaseOrderRepository.findOne({
            where: { purchaseOrderId },
            relations: ['invoices', 'items'],
        });
        if (!purchaseOrder) {
            return;
        }
        const totalInvoicedAmount = purchaseOrder.invoices?.reduce((sum, invoice) => sum + Number(invoice.amount), 0) || 0;
        const totalInvoicedQuantity = purchaseOrder.invoices?.reduce((sum, invoice) => sum + Number(invoice.materialQuantity), 0) || 0;
        const totalExpectedQuantity = purchaseOrder.items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;
        let invoiceStatus = 'sin_factura';
        if (totalInvoicedAmount > 0 || totalInvoicedQuantity > 0) {
            const amountComplete = totalInvoicedAmount >= Number(purchaseOrder.totalAmount) * 0.99;
            const quantityComplete = totalExpectedQuantity > 0
                ? totalInvoicedQuantity >= totalExpectedQuantity * 0.99
                : true;
            if (amountComplete && quantityComplete) {
                invoiceStatus = 'factura_completa';
            }
            else {
                invoiceStatus = 'facturacion_parcial';
            }
        }
        purchaseOrder.totalInvoicedAmount = totalInvoicedAmount;
        purchaseOrder.totalInvoicedQuantity = totalInvoicedQuantity;
        purchaseOrder.invoiceStatus = invoiceStatus;
        await this.purchaseOrderRepository.save(purchaseOrder);
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(invoice_entity_1.Invoice)),
    __param(1, (0, typeorm_1.InjectRepository)(purchase_order_entity_1.PurchaseOrder)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map