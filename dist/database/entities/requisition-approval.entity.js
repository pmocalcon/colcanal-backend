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
exports.RequisitionApproval = void 0;
const typeorm_1 = require("typeorm");
const requisition_entity_1 = require("./requisition.entity");
const user_entity_1 = require("./user.entity");
const requisition_status_entity_1 = require("./requisition-status.entity");
let RequisitionApproval = class RequisitionApproval {
    approvalId;
    requisitionId;
    userId;
    action;
    stepOrder;
    previousStatusId;
    newStatusId;
    comments;
    createdAt;
    requisition;
    user;
    previousStatus;
    newStatus;
};
exports.RequisitionApproval = RequisitionApproval;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'approval_id' }),
    __metadata("design:type", Number)
], RequisitionApproval.prototype, "approvalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requisition_id' }),
    __metadata("design:type", Number)
], RequisitionApproval.prototype, "requisitionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", Number)
], RequisitionApproval.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'action', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], RequisitionApproval.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'step_order', type: 'integer' }),
    __metadata("design:type", Number)
], RequisitionApproval.prototype, "stepOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'previous_status_id', nullable: true }),
    __metadata("design:type", Number)
], RequisitionApproval.prototype, "previousStatusId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'new_status_id' }),
    __metadata("design:type", Number)
], RequisitionApproval.prototype, "newStatusId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RequisitionApproval.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        name: 'created_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], RequisitionApproval.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_entity_1.Requisition, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'requisition_id' }),
    __metadata("design:type", requisition_entity_1.Requisition)
], RequisitionApproval.prototype, "requisition", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], RequisitionApproval.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_status_entity_1.RequisitionStatus, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'previous_status_id' }),
    __metadata("design:type", requisition_status_entity_1.RequisitionStatus)
], RequisitionApproval.prototype, "previousStatus", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_status_entity_1.RequisitionStatus),
    (0, typeorm_1.JoinColumn)({ name: 'new_status_id' }),
    __metadata("design:type", requisition_status_entity_1.RequisitionStatus)
], RequisitionApproval.prototype, "newStatus", void 0);
exports.RequisitionApproval = RequisitionApproval = __decorate([
    (0, typeorm_1.Entity)('requisition_approvals')
], RequisitionApproval);
//# sourceMappingURL=requisition-approval.entity.js.map