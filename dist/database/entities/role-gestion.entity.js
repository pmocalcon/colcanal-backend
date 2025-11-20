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
exports.RoleGestion = void 0;
const typeorm_1 = require("typeorm");
const role_entity_1 = require("./role.entity");
const gestion_entity_1 = require("./gestion.entity");
let RoleGestion = class RoleGestion {
    id;
    rolId;
    gestionId;
    role;
    gestion;
};
exports.RoleGestion = RoleGestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], RoleGestion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rol_id' }),
    __metadata("design:type", Number)
], RoleGestion.prototype, "rolId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gestion_id' }),
    __metadata("design:type", Number)
], RoleGestion.prototype, "gestionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => role_entity_1.Role, (role) => role.roleGestiones),
    (0, typeorm_1.JoinColumn)({ name: 'rol_id' }),
    __metadata("design:type", role_entity_1.Role)
], RoleGestion.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => gestion_entity_1.Gestion, (gestion) => gestion.roleGestiones),
    (0, typeorm_1.JoinColumn)({ name: 'gestion_id' }),
    __metadata("design:type", gestion_entity_1.Gestion)
], RoleGestion.prototype, "gestion", void 0);
exports.RoleGestion = RoleGestion = __decorate([
    (0, typeorm_1.Entity)('roles_gestiones'),
    (0, typeorm_1.Unique)(['rolId', 'gestionId'])
], RoleGestion);
//# sourceMappingURL=role-gestion.entity.js.map