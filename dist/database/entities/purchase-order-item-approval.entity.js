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
exports.PurchaseOrderItemApproval = exports.ItemApprovalStatus = void 0;
const typeorm_1 = require("typeorm");
const purchase_order_approval_entity_1 = require("./purchase-order-approval.entity");
const purchase_order_item_entity_1 = require("./purchase-order-item.entity");
var ItemApprovalStatus;
(function (ItemApprovalStatus) {
    ItemApprovalStatus["PENDING"] = "pendiente";
    ItemApprovalStatus["APPROVED"] = "aprobado";
    ItemApprovalStatus["REJECTED"] = "rechazado";
})(ItemApprovalStatus || (exports.ItemApprovalStatus = ItemApprovalStatus = {}));
let PurchaseOrderItemApproval = class PurchaseOrderItemApproval {
    itemApprovalId;
    poApprovalId;
    poItemId;
    approvalStatus;
    comments;
    createdAt;
    purchaseOrderApproval;
    purchaseOrderItem;
};
exports.PurchaseOrderItemApproval = PurchaseOrderItemApproval;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'item_approval_id' }),
    __metadata("design:type", Number)
], PurchaseOrderItemApproval.prototype, "itemApprovalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'po_approval_id' }),
    __metadata("design:type", Number)
], PurchaseOrderItemApproval.prototype, "poApprovalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'po_item_id' }),
    __metadata("design:type", Number)
], PurchaseOrderItemApproval.prototype, "poItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'approval_status',
        type: 'enum',
        enum: ItemApprovalStatus,
        default: ItemApprovalStatus.PENDING,
    }),
    __metadata("design:type", String)
], PurchaseOrderItemApproval.prototype, "approvalStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'comments', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PurchaseOrderItemApproval.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PurchaseOrderItemApproval.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_approval_entity_1.PurchaseOrderApproval, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'po_approval_id' }),
    __metadata("design:type", purchase_order_approval_entity_1.PurchaseOrderApproval)
], PurchaseOrderItemApproval.prototype, "purchaseOrderApproval", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_item_entity_1.PurchaseOrderItem, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'po_item_id' }),
    __metadata("design:type", purchase_order_item_entity_1.PurchaseOrderItem)
], PurchaseOrderItemApproval.prototype, "purchaseOrderItem", void 0);
exports.PurchaseOrderItemApproval = PurchaseOrderItemApproval = __decorate([
    (0, typeorm_1.Entity)('purchase_order_item_approvals')
], PurchaseOrderItemApproval);
//# sourceMappingURL=purchase-order-item-approval.entity.js.map