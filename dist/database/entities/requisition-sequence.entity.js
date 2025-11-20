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
exports.RequisitionSequence = void 0;
const typeorm_1 = require("typeorm");
const requisition_prefix_entity_1 = require("./requisition-prefix.entity");
let RequisitionSequence = class RequisitionSequence {
    prefixId;
    lastNumber;
    requisitionPrefix;
};
exports.RequisitionSequence = RequisitionSequence;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'prefix_id' }),
    __metadata("design:type", Number)
], RequisitionSequence.prototype, "prefixId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_number', type: 'integer' }),
    __metadata("design:type", Number)
], RequisitionSequence.prototype, "lastNumber", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => requisition_prefix_entity_1.RequisitionPrefix, (prefix) => prefix.requisitionSequence),
    (0, typeorm_1.JoinColumn)({ name: 'prefix_id' }),
    __metadata("design:type", requisition_prefix_entity_1.RequisitionPrefix)
], RequisitionSequence.prototype, "requisitionPrefix", void 0);
exports.RequisitionSequence = RequisitionSequence = __decorate([
    (0, typeorm_1.Entity)('requisition_sequences')
], RequisitionSequence);
//# sourceMappingURL=requisition-sequence.entity.js.map