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
exports.MaterialReceipt = void 0;
const typeorm_1 = require("typeorm");
const purchase_order_item_entity_1 = require("./purchase-order-item.entity");
const user_entity_1 = require("./user.entity");
let MaterialReceipt = class MaterialReceipt {
    receiptId;
    poItemId;
    quantityReceived;
    receivedDate;
    observations;
    overdeliveryJustification;
    createdBy;
    createdAt;
    updatedAt;
    purchaseOrderItem;
    creator;
};
exports.MaterialReceipt = MaterialReceipt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'receipt_id' }),
    __metadata("design:type", Number)
], MaterialReceipt.prototype, "receiptId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'po_item_id', type: 'int' }),
    __metadata("design:type", Number)
], MaterialReceipt.prototype, "poItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quantity_received', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], MaterialReceipt.prototype, "quantityReceived", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_date', type: 'date' }),
    __metadata("design:type", Date)
], MaterialReceipt.prototype, "receivedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], MaterialReceipt.prototype, "observations", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'overdelivery_justification', type: 'text', nullable: true }),
    __metadata("design:type", String)
], MaterialReceipt.prototype, "overdeliveryJustification", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'int' }),
    __metadata("design:type", Number)
], MaterialReceipt.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], MaterialReceipt.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], MaterialReceipt.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_item_entity_1.PurchaseOrderItem, (poItem) => poItem.receipts),
    (0, typeorm_1.JoinColumn)({ name: 'po_item_id' }),
    __metadata("design:type", purchase_order_item_entity_1.PurchaseOrderItem)
], MaterialReceipt.prototype, "purchaseOrderItem", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], MaterialReceipt.prototype, "creator", void 0);
exports.MaterialReceipt = MaterialReceipt = __decorate([
    (0, typeorm_1.Entity)('material_receipts')
], MaterialReceipt);
//# sourceMappingURL=material-receipt.entity.js.map