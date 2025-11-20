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
exports.MaterialPriceHistory = void 0;
const typeorm_1 = require("typeorm");
const material_entity_1 = require("./material.entity");
const supplier_entity_1 = require("./supplier.entity");
const purchase_order_item_entity_1 = require("./purchase-order-item.entity");
const purchase_order_entity_1 = require("./purchase-order.entity");
const user_entity_1 = require("./user.entity");
let MaterialPriceHistory = class MaterialPriceHistory {
    priceHistoryId;
    materialId;
    supplierId;
    unitPrice;
    hasIva;
    ivaPercentage;
    discount;
    purchaseOrderItemId;
    purchaseOrderId;
    createdBy;
    createdAt;
    material;
    supplier;
    purchaseOrderItem;
    purchaseOrder;
    creator;
};
exports.MaterialPriceHistory = MaterialPriceHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'price_history_id' }),
    __metadata("design:type", Number)
], MaterialPriceHistory.prototype, "priceHistoryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'material_id' }),
    __metadata("design:type", Number)
], MaterialPriceHistory.prototype, "materialId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_id' }),
    __metadata("design:type", Number)
], MaterialPriceHistory.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], MaterialPriceHistory.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'has_iva', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], MaterialPriceHistory.prototype, "hasIva", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'iva_percentage', type: 'decimal', precision: 5, scale: 2, default: 19 }),
    __metadata("design:type", Number)
], MaterialPriceHistory.prototype, "ivaPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], MaterialPriceHistory.prototype, "discount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purchase_order_item_id' }),
    __metadata("design:type", Number)
], MaterialPriceHistory.prototype, "purchaseOrderItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purchase_order_id' }),
    __metadata("design:type", Number)
], MaterialPriceHistory.prototype, "purchaseOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", Number)
], MaterialPriceHistory.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], MaterialPriceHistory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => material_entity_1.Material),
    (0, typeorm_1.JoinColumn)({ name: 'material_id' }),
    __metadata("design:type", material_entity_1.Material)
], MaterialPriceHistory.prototype, "material", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supplier_entity_1.Supplier),
    (0, typeorm_1.JoinColumn)({ name: 'supplier_id' }),
    __metadata("design:type", supplier_entity_1.Supplier)
], MaterialPriceHistory.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_item_entity_1.PurchaseOrderItem),
    (0, typeorm_1.JoinColumn)({ name: 'purchase_order_item_id' }),
    __metadata("design:type", purchase_order_item_entity_1.PurchaseOrderItem)
], MaterialPriceHistory.prototype, "purchaseOrderItem", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_entity_1.PurchaseOrder),
    (0, typeorm_1.JoinColumn)({ name: 'purchase_order_id' }),
    __metadata("design:type", purchase_order_entity_1.PurchaseOrder)
], MaterialPriceHistory.prototype, "purchaseOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], MaterialPriceHistory.prototype, "creator", void 0);
exports.MaterialPriceHistory = MaterialPriceHistory = __decorate([
    (0, typeorm_1.Entity)('material_price_history')
], MaterialPriceHistory);
//# sourceMappingURL=material-price-history.entity.js.map