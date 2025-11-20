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
exports.PurchaseOrderApproval = exports.ApprovalStatus = void 0;
const typeorm_1 = require("typeorm");
const purchase_order_entity_1 = require("./purchase-order.entity");
const user_entity_1 = require("./user.entity");
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "pendiente";
    ApprovalStatus["APPROVED"] = "aprobado";
    ApprovalStatus["REJECTED"] = "rechazado";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
let PurchaseOrderApproval = class PurchaseOrderApproval {
    approvalId;
    purchaseOrderId;
    approverId;
    approvalStatus;
    comments;
    rejectionReason;
    approvalDate;
    deadline;
    isOverdue;
    createdAt;
    purchaseOrder;
    approver;
};
exports.PurchaseOrderApproval = PurchaseOrderApproval;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'approval_id' }),
    __metadata("design:type", Number)
], PurchaseOrderApproval.prototype, "approvalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purchase_order_id' }),
    __metadata("design:type", Number)
], PurchaseOrderApproval.prototype, "purchaseOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approver_id' }),
    __metadata("design:type", Number)
], PurchaseOrderApproval.prototype, "approverId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'approval_status',
        type: 'enum',
        enum: ApprovalStatus,
        default: ApprovalStatus.PENDING,
    }),
    __metadata("design:type", String)
], PurchaseOrderApproval.prototype, "approvalStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'comments', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PurchaseOrderApproval.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejection_reason', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PurchaseOrderApproval.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approval_date', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], PurchaseOrderApproval.prototype, "approvalDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'deadline', type: 'timestamp' }),
    __metadata("design:type", Date)
], PurchaseOrderApproval.prototype, "deadline", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_overdue', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PurchaseOrderApproval.prototype, "isOverdue", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PurchaseOrderApproval.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_entity_1.PurchaseOrder, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'purchase_order_id' }),
    __metadata("design:type", purchase_order_entity_1.PurchaseOrder)
], PurchaseOrderApproval.prototype, "purchaseOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'approver_id' }),
    __metadata("design:type", user_entity_1.User)
], PurchaseOrderApproval.prototype, "approver", void 0);
exports.PurchaseOrderApproval = PurchaseOrderApproval = __decorate([
    (0, typeorm_1.Entity)('purchase_order_approvals')
], PurchaseOrderApproval);
//# sourceMappingURL=purchase-order-approval.entity.js.map