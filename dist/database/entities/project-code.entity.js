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
exports.ProjectCode = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("./company.entity");
const project_entity_1 = require("./project.entity");
const requisition_entity_1 = require("./requisition.entity");
let ProjectCode = class ProjectCode {
    codeId;
    companyId;
    projectId;
    code;
    company;
    project;
    requisitions;
};
exports.ProjectCode = ProjectCode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'code_id' }),
    __metadata("design:type", Number)
], ProjectCode.prototype, "codeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'company_id' }),
    __metadata("design:type", Number)
], ProjectCode.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', nullable: true }),
    __metadata("design:type", Number)
], ProjectCode.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ProjectCode.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company, (company) => company.projectCodes),
    (0, typeorm_1.JoinColumn)({ name: 'company_id' }),
    __metadata("design:type", company_entity_1.Company)
], ProjectCode.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, (project) => project.projectCodes, {
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], ProjectCode.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_entity_1.Requisition, (requisition) => requisition.projectCode),
    __metadata("design:type", Array)
], ProjectCode.prototype, "requisitions", void 0);
exports.ProjectCode = ProjectCode = __decorate([
    (0, typeorm_1.Entity)('project_codes')
], ProjectCode);
//# sourceMappingURL=project-code.entity.js.map