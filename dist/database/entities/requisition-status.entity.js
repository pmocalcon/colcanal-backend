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
exports.RequisitionStatus = void 0;
const typeorm_1 = require("typeorm");
const requisition_entity_1 = require("./requisition.entity");
const requisition_approval_entity_1 = require("./requisition-approval.entity");
let RequisitionStatus = class RequisitionStatus {
    statusId;
    code;
    name;
    description;
    color;
    order;
    requisitions;
    approvalsAsPreviousStatus;
    approvalsAsNewStatus;
};
exports.RequisitionStatus = RequisitionStatus;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'status_id' }),
    __metadata("design:type", Number)
], RequisitionStatus.prototype, "statusId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], RequisitionStatus.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], RequisitionStatus.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RequisitionStatus.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], RequisitionStatus.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], RequisitionStatus.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_entity_1.Requisition, (requisition) => requisition.status),
    __metadata("design:type", Array)
], RequisitionStatus.prototype, "requisitions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_approval_entity_1.RequisitionApproval, (approval) => approval.previousStatus),
    __metadata("design:type", Array)
], RequisitionStatus.prototype, "approvalsAsPreviousStatus", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_approval_entity_1.RequisitionApproval, (approval) => approval.newStatus),
    __metadata("design:type", Array)
], RequisitionStatus.prototype, "approvalsAsNewStatus", void 0);
exports.RequisitionStatus = RequisitionStatus = __decorate([
    (0, typeorm_1.Entity)('requisition_statuses')
], RequisitionStatus);
//# sourceMappingURL=requisition-status.entity.js.map