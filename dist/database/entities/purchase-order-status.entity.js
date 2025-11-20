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
exports.PurchaseOrderStatus = void 0;
const typeorm_1 = require("typeorm");
const purchase_order_entity_1 = require("./purchase-order.entity");
let PurchaseOrderStatus = class PurchaseOrderStatus {
    statusId;
    code;
    name;
    description;
    color;
    order;
    purchaseOrders;
};
exports.PurchaseOrderStatus = PurchaseOrderStatus;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'status_id' }),
    __metadata("design:type", Number)
], PurchaseOrderStatus.prototype, "statusId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], PurchaseOrderStatus.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], PurchaseOrderStatus.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PurchaseOrderStatus.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], PurchaseOrderStatus.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], PurchaseOrderStatus.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => purchase_order_entity_1.PurchaseOrder, (purchaseOrder) => purchaseOrder.approvalStatus),
    __metadata("design:type", Array)
], PurchaseOrderStatus.prototype, "purchaseOrders", void 0);
exports.PurchaseOrderStatus = PurchaseOrderStatus = __decorate([
    (0, typeorm_1.Entity)('purchase_order_statuses')
], PurchaseOrderStatus);
//# sourceMappingURL=purchase-order-status.entity.js.map