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
exports.Authorization = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const gestion_entity_1 = require("./gestion.entity");
let Authorization = class Authorization {
    id;
    usuarioAutorizadorId;
    usuarioAutorizadoId;
    gestionId;
    tipoAutorizacion;
    nivel;
    esActivo;
    usuarioAutorizador;
    usuarioAutorizado;
    gestion;
};
exports.Authorization = Authorization;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Authorization.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'usuario_autorizador' }),
    __metadata("design:type", Number)
], Authorization.prototype, "usuarioAutorizadorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'usuario_autorizado' }),
    __metadata("design:type", Number)
], Authorization.prototype, "usuarioAutorizadoId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gestion_id', nullable: true }),
    __metadata("design:type", Number)
], Authorization.prototype, "gestionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tipo_autorizacion', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], Authorization.prototype, "tipoAutorizacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 1 }),
    __metadata("design:type", Number)
], Authorization.prototype, "nivel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'es_activo', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Authorization.prototype, "esActivo", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.authorizationsGranted),
    (0, typeorm_1.JoinColumn)({ name: 'usuario_autorizador' }),
    __metadata("design:type", user_entity_1.User)
], Authorization.prototype, "usuarioAutorizador", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.authorizationsReceived),
    (0, typeorm_1.JoinColumn)({ name: 'usuario_autorizado' }),
    __metadata("design:type", user_entity_1.User)
], Authorization.prototype, "usuarioAutorizado", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => gestion_entity_1.Gestion, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'gestion_id' }),
    __metadata("design:type", gestion_entity_1.Gestion)
], Authorization.prototype, "gestion", void 0);
exports.Authorization = Authorization = __decorate([
    (0, typeorm_1.Entity)('autorizaciones'),
    (0, typeorm_1.Unique)(['usuarioAutorizadorId', 'usuarioAutorizadoId', 'gestionId', 'tipoAutorizacion'])
], Authorization);
//# sourceMappingURL=authorization.entity.js.map