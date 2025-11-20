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
exports.PurchaseOrderItem = void 0;
const typeorm_1 = require("typeorm");
const purchase_order_entity_1 = require("./purchase-order.entity");
const requisition_item_entity_1 = require("./requisition-item.entity");
const requisition_item_quotation_entity_1 = require("./requisition-item-quotation.entity");
const material_receipt_entity_1 = require("./material-receipt.entity");
let PurchaseOrderItem = class PurchaseOrderItem {
    poItemId;
    purchaseOrderId;
    requisitionItemId;
    quotationId;
    quantity;
    unitPrice;
    hasIva;
    ivaPercentage;
    subtotal;
    ivaAmount;
    discount;
    totalAmount;
    purchaseOrder;
    requisitionItem;
    quotation;
    receipts;
};
exports.PurchaseOrderItem = PurchaseOrderItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'po_item_id' }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "poItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purchase_order_id' }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "purchaseOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requisition_item_id' }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "requisitionItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quotation_id' }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "quotationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'has_iva', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PurchaseOrderItem.prototype, "hasIva", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'iva_percentage', type: 'decimal', precision: 5, scale: 2, default: 19 }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "ivaPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'iva_amount', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "ivaAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "discount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_entity_1.PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'purchase_order_id' }),
    __metadata("design:type", purchase_order_entity_1.PurchaseOrder)
], PurchaseOrderItem.prototype, "purchaseOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_item_entity_1.RequisitionItem, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'requisition_item_id' }),
    __metadata("design:type", requisition_item_entity_1.RequisitionItem)
], PurchaseOrderItem.prototype, "requisitionItem", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_item_quotation_entity_1.RequisitionItemQuotation),
    (0, typeorm_1.JoinColumn)({ name: 'quotation_id' }),
    __metadata("design:type", requisition_item_quotation_entity_1.RequisitionItemQuotation)
], PurchaseOrderItem.prototype, "quotation", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => material_receipt_entity_1.MaterialReceipt, (receipt) => receipt.purchaseOrderItem),
    __metadata("design:type", Array)
], PurchaseOrderItem.prototype, "receipts", void 0);
exports.PurchaseOrderItem = PurchaseOrderItem = __decorate([
    (0, typeorm_1.Entity)('purchase_order_items')
], PurchaseOrderItem);
//# sourceMappingURL=purchase-order-item.entity.js.map