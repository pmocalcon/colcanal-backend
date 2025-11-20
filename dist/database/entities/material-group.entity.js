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
exports.MaterialGroup = void 0;
const typeorm_1 = require("typeorm");
const material_entity_1 = require("./material.entity");
let MaterialGroup = class MaterialGroup {
    groupId;
    name;
    materials;
};
exports.MaterialGroup = MaterialGroup;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'group_id' }),
    __metadata("design:type", Number)
], MaterialGroup.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', unique: true }),
    __metadata("design:type", String)
], MaterialGroup.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => material_entity_1.Material, (material) => material.materialGroup),
    __metadata("design:type", Array)
], MaterialGroup.prototype, "materials", void 0);
exports.MaterialGroup = MaterialGroup = __decorate([
    (0, typeorm_1.Entity)('material_groups')
], MaterialGroup);
//# sourceMappingURL=material-group.entity.js.map