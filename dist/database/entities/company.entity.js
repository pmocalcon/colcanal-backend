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
exports.Company = void 0;
const typeorm_1 = require("typeorm");
const project_entity_1 = require("./project.entity");
const operation_center_entity_1 = require("./operation-center.entity");
const project_code_entity_1 = require("./project-code.entity");
const requisition_prefix_entity_1 = require("./requisition-prefix.entity");
let Company = class Company {
    companyId;
    name;
    projects;
    operationCenters;
    projectCodes;
    requisitionPrefixes;
};
exports.Company = Company;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'company_id' }),
    __metadata("design:type", Number)
], Company.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', unique: true }),
    __metadata("design:type", String)
], Company.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => project_entity_1.Project, (project) => project.company),
    __metadata("design:type", Array)
], Company.prototype, "projects", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => operation_center_entity_1.OperationCenter, (center) => center.company),
    __metadata("design:type", Array)
], Company.prototype, "operationCenters", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => project_code_entity_1.ProjectCode, (code) => code.company),
    __metadata("design:type", Array)
], Company.prototype, "projectCodes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_prefix_entity_1.RequisitionPrefix, (prefix) => prefix.company),
    __metadata("design:type", Array)
], Company.prototype, "requisitionPrefixes", void 0);
exports.Company = Company = __decorate([
    (0, typeorm_1.Entity)('companies')
], Company);
//# sourceMappingURL=company.entity.js.map