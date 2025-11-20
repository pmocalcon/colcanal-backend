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
exports.Requisition = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("./company.entity");
const project_entity_1 = require("./project.entity");
const operation_center_entity_1 = require("./operation-center.entity");
const project_code_entity_1 = require("./project-code.entity");
const user_entity_1 = require("./user.entity");
const requisition_item_entity_1 = require("./requisition-item.entity");
const requisition_log_entity_1 = require("./requisition-log.entity");
const requisition_status_entity_1 = require("./requisition-status.entity");
const purchase_order_entity_1 = require("./purchase-order.entity");
const requisition_approval_entity_1 = require("./requisition-approval.entity");
let Requisition = class Requisition {
    requisitionId;
    requisitionNumber;
    companyId;
    projectId;
    operationCenterId;
    projectCodeId;
    createdBy;
    statusId;
    reviewedBy;
    approvedBy;
    createdAt;
    updatedAt;
    reviewedAt;
    approvedAt;
    obra;
    codigoObra;
    company;
    project;
    operationCenter;
    projectCode;
    creator;
    status;
    reviewer;
    approver;
    items;
    logs;
    purchaseOrders;
    approvals;
};
exports.Requisition = Requisition;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'requisition_id' }),
    __metadata("design:type", Number)
], Requisition.prototype, "requisitionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requisition_number', type: 'varchar', length: 20, unique: true }),
    __metadata("design:type", String)
], Requisition.prototype, "requisitionNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'company_id' }),
    __metadata("design:type", Number)
], Requisition.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', nullable: true }),
    __metadata("design:type", Number)
], Requisition.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operation_center_id' }),
    __metadata("design:type", Number)
], Requisition.prototype, "operationCenterId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_code_id', nullable: true }),
    __metadata("design:type", Number)
], Requisition.prototype, "projectCodeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", Number)
], Requisition.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status_id', default: 1 }),
    __metadata("design:type", Number)
], Requisition.prototype, "statusId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reviewed_by', nullable: true }),
    __metadata("design:type", Number)
], Requisition.prototype, "reviewedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by', nullable: true }),
    __metadata("design:type", Number)
], Requisition.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        name: 'created_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Requisition.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        name: 'updated_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Requisition.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reviewed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Requisition.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Requisition.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'obra', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Requisition.prototype, "obra", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'codigo_obra', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Requisition.prototype, "codigoObra", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'company_id' }),
    __metadata("design:type", company_entity_1.Company)
], Requisition.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], Requisition.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => operation_center_entity_1.OperationCenter),
    (0, typeorm_1.JoinColumn)({ name: 'operation_center_id' }),
    __metadata("design:type", operation_center_entity_1.OperationCenter)
], Requisition.prototype, "operationCenter", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_code_entity_1.ProjectCode, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'project_code_id' }),
    __metadata("design:type", project_code_entity_1.ProjectCode)
], Requisition.prototype, "projectCode", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], Requisition.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_status_entity_1.RequisitionStatus),
    (0, typeorm_1.JoinColumn)({ name: 'status_id' }),
    __metadata("design:type", requisition_status_entity_1.RequisitionStatus)
], Requisition.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'reviewed_by' }),
    __metadata("design:type", user_entity_1.User)
], Requisition.prototype, "reviewer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'approved_by' }),
    __metadata("design:type", user_entity_1.User)
], Requisition.prototype, "approver", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_item_entity_1.RequisitionItem, (item) => item.requisition, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], Requisition.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_log_entity_1.RequisitionLog, (log) => log.requisition, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], Requisition.prototype, "logs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => purchase_order_entity_1.PurchaseOrder, (purchaseOrder) => purchaseOrder.requisition),
    __metadata("design:type", Array)
], Requisition.prototype, "purchaseOrders", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_approval_entity_1.RequisitionApproval, (approval) => approval.requisition),
    __metadata("design:type", Array)
], Requisition.prototype, "approvals", void 0);
exports.Requisition = Requisition = __decorate([
    (0, typeorm_1.Entity)('requisitions')
], Requisition);
//# sourceMappingURL=requisition.entity.js.map