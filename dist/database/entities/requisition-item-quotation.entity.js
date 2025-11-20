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
exports.RequisitionItemQuotation = void 0;
const typeorm_1 = require("typeorm");
const requisition_item_entity_1 = require("./requisition-item.entity");
const supplier_entity_1 = require("./supplier.entity");
const user_entity_1 = require("./user.entity");
const purchase_order_item_entity_1 = require("./purchase-order-item.entity");
let RequisitionItemQuotation = class RequisitionItemQuotation {
    quotationId;
    requisitionItemId;
    action;
    supplierId;
    supplierOrder;
    justification;
    observations;
    version;
    isActive;
    unitPrice;
    hasIva;
    discount;
    isSelected;
    createdBy;
    createdAt;
    requisitionItem;
    supplier;
    creator;
    purchaseOrderItems;
};
exports.RequisitionItemQuotation = RequisitionItemQuotation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'quotation_id' }),
    __metadata("design:type", Number)
], RequisitionItemQuotation.prototype, "quotationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requisition_item_id' }),
    __metadata("design:type", Number)
], RequisitionItemQuotation.prototype, "requisitionItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 20,
        comment: 'cotizar | no_requiere',
    }),
    __metadata("design:type", String)
], RequisitionItemQuotation.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_id', nullable: true }),
    __metadata("design:type", Object)
], RequisitionItemQuotation.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'supplier_order',
        type: 'smallint',
        default: 1,
        comment: '1 for first supplier, 2 for second supplier',
    }),
    __metadata("design:type", Number)
], RequisitionItemQuotation.prototype, "supplierOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RequisitionItemQuotation.prototype, "justification", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RequisitionItemQuotation.prototype, "observations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 1 }),
    __metadata("design:type", Number)
], RequisitionItemQuotation.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RequisitionItemQuotation.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'unit_price',
        type: 'decimal',
        precision: 15,
        scale: 2,
        nullable: true,
        comment: 'Precio unitario sin IVA ingresado por Compras',
    }),
    __metadata("design:type", Object)
], RequisitionItemQuotation.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'has_iva',
        type: 'boolean',
        default: false,
        comment: 'Indica si el ítem tiene IVA del 19%',
    }),
    __metadata("design:type", Boolean)
], RequisitionItemQuotation.prototype, "hasIva", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Descuento aplicado al ítem',
    }),
    __metadata("design:type", Number)
], RequisitionItemQuotation.prototype, "discount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'is_selected',
        type: 'boolean',
        default: false,
        comment: 'Marca el proveedor seleccionado cuando hay múltiples opciones',
    }),
    __metadata("design:type", Boolean)
], RequisitionItemQuotation.prototype, "isSelected", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", Number)
], RequisitionItemQuotation.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        name: 'created_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], RequisitionItemQuotation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_item_entity_1.RequisitionItem, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'requisition_item_id' }),
    __metadata("design:type", requisition_item_entity_1.RequisitionItem)
], RequisitionItemQuotation.prototype, "requisitionItem", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supplier_entity_1.Supplier, (supplier) => supplier.quotations, {
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)({ name: 'supplier_id' }),
    __metadata("design:type", supplier_entity_1.Supplier)
], RequisitionItemQuotation.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], RequisitionItemQuotation.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => purchase_order_item_entity_1.PurchaseOrderItem, (poItem) => poItem.quotation),
    __metadata("design:type", Array)
], RequisitionItemQuotation.prototype, "purchaseOrderItems", void 0);
exports.RequisitionItemQuotation = RequisitionItemQuotation = __decorate([
    (0, typeorm_1.Entity)('requisition_item_quotations')
], RequisitionItemQuotation);
//# sourceMappingURL=requisition-item-quotation.entity.js.map