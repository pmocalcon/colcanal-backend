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
exports.RequisitionItemApproval = void 0;
const typeorm_1 = require("typeorm");
const requisition_entity_1 = require("./requisition.entity");
const requisition_item_entity_1 = require("./requisition-item.entity");
const user_entity_1 = require("./user.entity");
let RequisitionItemApproval = class RequisitionItemApproval {
    itemApprovalId;
    requisitionId;
    itemNumber;
    materialId;
    quantity;
    observation;
    requisitionItemId;
    userId;
    approvalLevel;
    status;
    comments;
    isValid;
    createdAt;
    requisition;
    requisitionItem;
    user;
};
exports.RequisitionItemApproval = RequisitionItemApproval;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'item_approval_id' }),
    __metadata("design:type", Number)
], RequisitionItemApproval.prototype, "itemApprovalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requisition_id' }),
    __metadata("design:type", Number)
], RequisitionItemApproval.prototype, "requisitionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'item_number', type: 'integer' }),
    __metadata("design:type", Number)
], RequisitionItemApproval.prototype, "itemNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'material_id' }),
    __metadata("design:type", Number)
], RequisitionItemApproval.prototype, "materialId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], RequisitionItemApproval.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RequisitionItemApproval.prototype, "observation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requisition_item_id', nullable: true }),
    __metadata("design:type", Number)
], RequisitionItemApproval.prototype, "requisitionItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", Number)
], RequisitionItemApproval.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approval_level', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], RequisitionItemApproval.prototype, "approvalLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], RequisitionItemApproval.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RequisitionItemApproval.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_valid', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RequisitionItemApproval.prototype, "isValid", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        name: 'created_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], RequisitionItemApproval.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_entity_1.Requisition, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'requisition_id' }),
    __metadata("design:type", requisition_entity_1.Requisition)
], RequisitionItemApproval.prototype, "requisition", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_item_entity_1.RequisitionItem, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'requisition_item_id' }),
    __metadata("design:type", requisition_item_entity_1.RequisitionItem)
], RequisitionItemApproval.prototype, "requisitionItem", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], RequisitionItemApproval.prototype, "user", void 0);
exports.RequisitionItemApproval = RequisitionItemApproval = __decorate([
    (0, typeorm_1.Entity)('requisition_item_approvals'),
    (0, typeorm_1.Index)(['requisitionId', 'itemNumber', 'materialId', 'approvalLevel'], { unique: true })
], RequisitionItemApproval);
//# sourceMappingURL=requisition-item-approval.entity.js.map