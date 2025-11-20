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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseOrder = exports.PurchaseOrderStatusCode = void 0;
const typeorm_1 = require("typeorm");
const requisition_entity_1 = require("./requisition.entity");
const supplier_entity_1 = require("./supplier.entity");
const user_entity_1 = require("./user.entity");
const purchase_order_item_entity_1 = require("./purchase-order-item.entity");
const purchase_order_approval_entity_1 = require("./purchase-order-approval.entity");
const purchase_order_status_entity_1 = require("./purchase-order-status.entity");
const invoice_entity_1 = require("./invoice.entity");
var PurchaseOrderStatusCode;
(function (PurchaseOrderStatusCode) {
    PurchaseOrderStatusCode["DRAFT"] = "borrador";
    PurchaseOrderStatusCode["PENDING_APPROVAL"] = "pendiente_aprobacion_gerencia";
    PurchaseOrderStatusCode["APPROVED"] = "aprobada_gerencia";
    PurchaseOrderStatusCode["REJECTED"] = "rechazada_gerencia";
    PurchaseOrderStatusCode["IN_RECEPTION"] = "en_recepcion";
    PurchaseOrderStatusCode["COMPLETED"] = "completada";
})(PurchaseOrderStatusCode || (exports.PurchaseOrderStatusCode = PurchaseOrderStatusCode = {}));
let PurchaseOrder = class PurchaseOrder {
    purchaseOrderId;
    purchaseOrderNumber;
    requisitionId;
    supplierId;
    issueDate;
    subtotal;
    totalIva;
    totalDiscount;
    totalAmount;
    approvalStatusId;
    rejectionCount;
    lastRejectionReason;
    currentApproverId;
    createdBy;
    totalInvoicedAmount;
    totalInvoicedQuantity;
    invoiceStatus;
    createdAt;
    updatedAt;
    requisition;
    supplier;
    creator;
    currentApprover;
    approvalStatus;
    items;
    approvals;
    invoices;
};
exports.PurchaseOrder = PurchaseOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'purchase_order_id' }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "purchaseOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purchase_order_number', type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], PurchaseOrder.prototype, "purchaseOrderNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requisition_id' }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "requisitionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_id' }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'issue_date', type: 'date' }),
    __metadata("design:type", Date)
], PurchaseOrder.prototype, "issueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_iva', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "totalIva", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_discount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "totalDiscount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approval_status_id' }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "approvalStatusId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejection_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "rejectionCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_rejection_reason', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PurchaseOrder.prototype, "lastRejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_approver_id', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "currentApproverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_invoiced_amount', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "totalInvoicedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_invoiced_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "totalInvoicedQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_status', type: 'varchar', length: 50, default: 'sin_factura' }),
    __metadata("design:type", String)
], PurchaseOrder.prototype, "invoiceStatus", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PurchaseOrder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PurchaseOrder.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_entity_1.Requisition, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'requisition_id' }),
    __metadata("design:type", requisition_entity_1.Requisition)
], PurchaseOrder.prototype, "requisition", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supplier_entity_1.Supplier),
    (0, typeorm_1.JoinColumn)({ name: 'supplier_id' }),
    __metadata("design:type", supplier_entity_1.Supplier)
], PurchaseOrder.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], PurchaseOrder.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'current_approver_id' }),
    __metadata("design:type", user_entity_1.User)
], PurchaseOrder.prototype, "currentApprover", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_status_entity_1.PurchaseOrderStatus, (status) => status.purchaseOrders),
    (0, typeorm_1.JoinColumn)({ name: 'approval_status_id' }),
    __metadata("design:type", purchase_order_status_entity_1.PurchaseOrderStatus)
], PurchaseOrder.prototype, "approvalStatus", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => purchase_order_item_entity_1.PurchaseOrderItem, (item) => item.purchaseOrder),
    __metadata("design:type", Array)
], PurchaseOrder.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => purchase_order_approval_entity_1.PurchaseOrderApproval, (approval) => approval.purchaseOrder),
    __metadata("design:type", Array)
], PurchaseOrder.prototype, "approvals", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => invoice_entity_1.Invoice, (invoice) => invoice.purchaseOrder),
    __metadata("design:type", Array)
], PurchaseOrder.prototype, "invoices", void 0);
exports.PurchaseOrder = PurchaseOrder = __decorate([
    (0, typeorm_1.Entity)('purchase_orders')
], PurchaseOrder);
//# sourceMappingURL=purchase-order.entity.js.map