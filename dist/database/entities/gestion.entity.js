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
exports.Gestion = void 0;
const typeorm_1 = require("typeorm");
const role_gestion_entity_1 = require("./role-gestion.entity");
const authorization_entity_1 = require("./authorization.entity");
let Gestion = class Gestion {
    gestionId;
    nombre;
    slug;
    icono;
    roleGestiones;
    authorizations;
};
exports.Gestion = Gestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'gestion_id' }),
    __metadata("design:type", Number)
], Gestion.prototype, "gestionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 120, unique: true }),
    __metadata("design:type", String)
], Gestion.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 120, unique: true }),
    __metadata("design:type", String)
], Gestion.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", String)
], Gestion.prototype, "icono", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => role_gestion_entity_1.RoleGestion, (roleGestion) => roleGestion.gestion),
    __metadata("design:type", Array)
], Gestion.prototype, "roleGestiones", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => authorization_entity_1.Authorization, (authorization) => authorization.gestion),
    __metadata("design:type", Array)
], Gestion.prototype, "authorizations", void 0);
exports.Gestion = Gestion = __decorate([
    (0, typeorm_1.Entity)('gestiones')
], Gestion);
//# sourceMappingURL=gestion.entity.js.map