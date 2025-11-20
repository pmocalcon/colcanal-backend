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
exports.Project = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("./company.entity");
const operation_center_entity_1 = require("./operation-center.entity");
const project_code_entity_1 = require("./project-code.entity");
const requisition_prefix_entity_1 = require("./requisition-prefix.entity");
let Project = class Project {
    projectId;
    companyId;
    name;
    company;
    operationCenters;
    projectCodes;
    requisitionPrefixes;
};
exports.Project = Project;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'project_id' }),
    __metadata("design:type", Number)
], Project.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'company_id' }),
    __metadata("design:type", Number)
], Project.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Project.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company, (company) => company.projects),
    (0, typeorm_1.JoinColumn)({ name: 'company_id' }),
    __metadata("design:type", company_entity_1.Company)
], Project.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => operation_center_entity_1.OperationCenter, (center) => center.project),
    __metadata("design:type", Array)
], Project.prototype, "operationCenters", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => project_code_entity_1.ProjectCode, (code) => code.project),
    __metadata("design:type", Array)
], Project.prototype, "projectCodes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_prefix_entity_1.RequisitionPrefix, (prefix) => prefix.project),
    __metadata("design:type", Array)
], Project.prototype, "requisitionPrefixes", void 0);
exports.Project = Project = __decorate([
    (0, typeorm_1.Entity)('projects'),
    (0, typeorm_1.Unique)(['companyId', 'name'])
], Project);
//# sourceMappingURL=project.entity.js.map