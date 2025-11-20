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
exports.RequisitionLog = void 0;
const typeorm_1 = require("typeorm");
const requisition_entity_1 = require("./requisition.entity");
const user_entity_1 = require("./user.entity");
let RequisitionLog = class RequisitionLog {
    logId;
    requisitionId;
    userId;
    action;
    previousStatus;
    newStatus;
    comments;
    createdAt;
    requisition;
    user;
};
exports.RequisitionLog = RequisitionLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'log_id' }),
    __metadata("design:type", Number)
], RequisitionLog.prototype, "logId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requisition_id' }),
    __metadata("design:type", Number)
], RequisitionLog.prototype, "requisitionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", Number)
], RequisitionLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
    }),
    __metadata("design:type", String)
], RequisitionLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'previous_status', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], RequisitionLog.prototype, "previousStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'new_status', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], RequisitionLog.prototype, "newStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RequisitionLog.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        name: 'created_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], RequisitionLog.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => requisition_entity_1.Requisition, (requisition) => requisition.logs, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'requisition_id' }),
    __metadata("design:type", requisition_entity_1.Requisition)
], RequisitionLog.prototype, "requisition", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], RequisitionLog.prototype, "user", void 0);
exports.RequisitionLog = RequisitionLog = __decorate([
    (0, typeorm_1.Entity)('requisition_logs')
], RequisitionLog);
//# sourceMappingURL=requisition-log.entity.js.map