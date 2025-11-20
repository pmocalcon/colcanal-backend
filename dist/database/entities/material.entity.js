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
exports.Material = void 0;
const typeorm_1 = require("typeorm");
const material_group_entity_1 = require("./material-group.entity");
const requisition_item_entity_1 = require("./requisition-item.entity");
let Material = class Material {
    materialId;
    code;
    description;
    groupId;
    materialGroup;
    requisitionItems;
};
exports.Material = Material;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'material_id' }),
    __metadata("design:type", Number)
], Material.prototype, "materialId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', unique: true }),
    __metadata("design:type", String)
], Material.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Material.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'group_id' }),
    __metadata("design:type", Number)
], Material.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => material_group_entity_1.MaterialGroup, (materialGroup) => materialGroup.materials),
    (0, typeorm_1.JoinColumn)({ name: 'group_id' }),
    __metadata("design:type", material_group_entity_1.MaterialGroup)
], Material.prototype, "materialGroup", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requisition_item_entity_1.RequisitionItem, (item) => item.material),
    __metadata("design:type", Array)
], Material.prototype, "requisitionItems", void 0);
exports.Material = Material = __decorate([
    (0, typeorm_1.Entity)('materials')
], Material);
//# sourceMappingURL=material.entity.js.map