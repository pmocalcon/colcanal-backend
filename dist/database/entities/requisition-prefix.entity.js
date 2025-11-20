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
exports.RequisitionPrefix = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("./company.entity");
const project_entity_1 = require("./project.entity");
const requisition_sequence_entity_1 = require("./requisition-sequence.entity");
let RequisitionPrefix = class RequisitionPrefix {
    prefixId;
    companyId;
    projectId;
    prefix;
    company;
    project;
    requisitionSequence;
};
exports.RequisitionPrefix = RequisitionPrefix;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'prefix_id' }),
    __metadata("design:type", Number)
], RequisitionPrefix.prototype, "prefixId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'company_id' }),
    __metadata("design:type", Number)
], RequisitionPrefix.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', nullable: true }),
    __metadata("design:type", Number)
], RequisitionPrefix.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], RequisitionPrefix.prototype, "prefix", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company, (company) => company.requisitionPrefixes),
    (0, typeorm_1.JoinColumn)({ name: 'company_id' }),
    __metadata("design:type", company_entity_1.Company)
], RequisitionPrefix.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, (project) => project.requisitionPrefixes, {
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], RequisitionPrefix.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => requisition_sequence_entity_1.RequisitionSequence, (sequence) => sequence.requisitionPrefix),
    __metadata("design:type", requisition_sequence_entity_1.RequisitionSequence)
], RequisitionPrefix.prototype, "requisitionSequence", void 0);
exports.RequisitionPrefix = RequisitionPrefix = __decorate([
    (0, typeorm_1.Entity)('requisition_prefixes')
], RequisitionPrefix);
//# sourceMappingURL=requisition-prefix.entity.js.map