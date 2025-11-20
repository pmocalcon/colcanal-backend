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
exports.OperationCenter = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("./company.entity");
const project_entity_1 = require("./project.entity");
const requisition_entity_1 = require("./requisition.entity");
const purchase_order_sequence_entity_1 = require("./purchase-order-sequence.entity");
let OperationCenter = class OperationCenter {
    centerId;
    companyId;
    projectId;
    code;
    company;
    project;
    requisitions;
    purchaseOrderSequences;
};
exports.OperationCenter = OperationCenter;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'center_id' }),
    __metadata("design:type", Number)
], OperationCenter.prototype, "centerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'company_id' }),
    __metadata("design:type", Number)
], OperationCenter.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', nullable: true }),
    __metadata("design:type", Number)
], OperationCenter.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3 }),
    __metadata("design:type", String)
], OperationCenter.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company, (company) => company.operationCenters),
    (0, typeorm_1.JoinColumn)({ name: 'company_id' }),
    __metadata("design:type", company_entity_1.Company)
], OperationCenter.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, (project) => project.operationCenters, {
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], OperationCenter.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_entity_1.Requisition, (requisition) => requisition.operationCenter),
    __metadata("design:type", Array)
], OperationCenter.prototype, "requisitions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => purchase_order_sequence_entity_1.PurchaseOrderSequence, (sequence) => sequence.operationCenter),
    __metadata("design:type", Array)
], OperationCenter.prototype, "purchaseOrderSequences", void 0);
exports.OperationCenter = OperationCenter = __decorate([
    (0, typeorm_1.Entity)('operation_centers')
], OperationCenter);
//# sourceMappingURL=operation-center.entity.js.map