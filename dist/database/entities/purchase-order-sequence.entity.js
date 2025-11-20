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
exports.PurchaseOrderSequence = void 0;
const typeorm_1 = require("typeorm");
const operation_center_entity_1 = require("./operation-center.entity");
let PurchaseOrderSequence = class PurchaseOrderSequence {
    sequenceId;
    operationCenterId;
    lastNumber;
    createdAt;
    updatedAt;
    operationCenter;
};
exports.PurchaseOrderSequence = PurchaseOrderSequence;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'sequence_id' }),
    __metadata("design:type", Number)
], PurchaseOrderSequence.prototype, "sequenceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operation_center_id', unique: true }),
    __metadata("design:type", Number)
], PurchaseOrderSequence.prototype, "operationCenterId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_number', type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], PurchaseOrderSequence.prototype, "lastNumber", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PurchaseOrderSequence.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PurchaseOrderSequence.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => operation_center_entity_1.OperationCenter, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'operation_center_id' }),
    __metadata("design:type", operation_center_entity_1.OperationCenter)
], PurchaseOrderSequence.prototype, "operationCenter", void 0);
exports.PurchaseOrderSequence = PurchaseOrderSequence = __decorate([
    (0, typeorm_1.Entity)('purchase_order_sequences')
], PurchaseOrderSequence);
//# sourceMappingURL=purchase-order-sequence.entity.js.map