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
exports.RequisitionItem = void 0;
const typeorm_1 = require("typeorm");
const requisition_entity_1 = require("./requisition.entity");
const material_entity_1 = require("./material.entity");
const requisition_item_quotation_entity_1 = require("./requisition-item-quotation.entity");
const purchase_order_item_entity_1 = require("./purchase-order-item.entity");
let RequisitionItem = class RequisitionItem {
    itemId;
    requisitionId;
    itemNumber;
    materialId;
    quantity;
    observation;
    requisition;
    material;
    quotations;
    purchaseOrderItems;
};
exports.RequisitionItem = RequisitionItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'item_id' }),
    __metadata("design:type", Number)
], RequisitionItem.prototype, "itemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requisition_id' }),
    __metadata("design:type", Number)
], RequisitionItem.prototype, "requisitionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'item_number', type: 'integer' }),
    __metadata("design:type", Number)
], RequisitionItem.prototype, "itemNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'material_id' }),
    __metadata("design:type", Number)
], RequisitionItem.prototype, "materialId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], RequisitionItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RequisitionItem.prototype, "observation", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_entity_1.Requisition, (requisition) => requisition.items, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'requisition_id' }),
    __metadata("design:type", requisition_entity_1.Requisition)
], RequisitionItem.prototype, "requisition", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => material_entity_1.Material),
    (0, typeorm_1.JoinColumn)({ name: 'material_id' }),
    __metadata("design:type", material_entity_1.Material)
], RequisitionItem.prototype, "material", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_item_quotation_entity_1.RequisitionItemQuotation, (quotation) => quotation.requisitionItem),
    __metadata("design:type", Array)
], RequisitionItem.prototype, "quotations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => purchase_order_item_entity_1.PurchaseOrderItem, (poItem) => poItem.requisitionItem),
    __metadata("design:type", Array)
], RequisitionItem.prototype, "purchaseOrderItems", void 0);
exports.RequisitionItem = RequisitionItem = __decorate([
    (0, typeorm_1.Entity)('requisition_items')
], RequisitionItem);
//# sourceMappingURL=requisition-item.entity.js.map