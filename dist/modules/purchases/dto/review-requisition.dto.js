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
exports.ReviewRequisitionDto = exports.ItemDecisionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class ItemDecisionDto {
    itemId;
    decision;
    comments;
}
exports.ItemDecisionDto = ItemDecisionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID del ítem de requisición',
        example: 1,
        type: Number,
    }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ItemDecisionDto.prototype, "itemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Decisión sobre el ítem individual',
        enum: ['approve', 'reject'],
        example: 'approve',
    }),
    (0, class_validator_1.IsIn)(['approve', 'reject']),
    __metadata("design:type", String)
], ItemDecisionDto.prototype, "decision", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Comentarios sobre el ítem (obligatorio si se rechaza)',
        example: 'Material innecesario para el proyecto',
        required: false,
    }),
    (0, class_validator_1.ValidateIf)((o) => o.decision === 'reject'),
    (0, class_validator_1.IsNotEmpty)({ message: 'Los comentarios son obligatorios al rechazar un ítem' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.ValidateIf)((o) => o.decision === 'approve'),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ItemDecisionDto.prototype, "comments", void 0);
class ReviewRequisitionDto {
    decision;
    comments;
    itemDecisions;
}
exports.ReviewRequisitionDto = ReviewRequisitionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Decisión del Director sobre la requisición (Nivel 1 - Revisión)\n\n' +
            '**Opciones:**\n' +
            '- **approve**: Aprobar la requisición (pasa a Gerencia para aprobación final)\n' +
            '- **reject**: Rechazar la requisición (vuelve al creador con comentarios)\n\n' +
            'Si se proporciona itemDecisions, esta decisión aplica como decisión general y se guardan las decisiones individuales',
        enum: ['approve', 'reject'],
        example: 'approve',
        type: String,
        required: true,
    }),
    (0, class_validator_1.IsIn)(['approve', 'reject'], {
        message: 'La decisión debe ser "approve" o "reject"',
    }),
    __metadata("design:type", String)
], ReviewRequisitionDto.prototype, "decision", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Comentarios del Director sobre la revisión. Opcional al aprobar, OBLIGATORIO al rechazar para justificar la decisión.',
        example: 'Requisición aprobada, materiales necesarios para el proyecto',
        type: String,
        required: false,
    }),
    (0, class_validator_1.ValidateIf)((o) => o.decision === 'reject'),
    (0, class_validator_1.IsNotEmpty)({ message: 'Los comentarios son obligatorios al rechazar una requisición' }),
    (0, class_validator_1.IsString)({ message: 'Los comentarios deben ser texto' }),
    (0, class_validator_1.ValidateIf)((o) => o.decision === 'approve'),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Los comentarios deben ser texto' }),
    __metadata("design:type", String)
], ReviewRequisitionDto.prototype, "comments", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Decisiones individuales por ítem (opcional). Si se proporcionan, se guardarán las aprobaciones/rechazos a nivel de ítem.',
        type: [ItemDecisionDto],
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ItemDecisionDto),
    __metadata("design:type", Array)
], ReviewRequisitionDto.prototype, "itemDecisions", void 0);
//# sourceMappingURL=review-requisition.dto.js.map