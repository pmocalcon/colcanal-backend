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
exports.CreateRequisitionItemDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CreateRequisitionItemDto {
    materialId;
    quantity;
    observation;
}
exports.CreateRequisitionItemDto = CreateRequisitionItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID del material a solicitar. Consulta los materiales disponibles en GET /purchases/master-data/materials',
        example: 1,
        type: Number,
        required: true,
    }),
    (0, class_validator_1.IsNumber)({}, { message: 'El materialId debe ser un número válido' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRequisitionItemDto.prototype, "materialId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cantidad de unidades del material a solicitar',
        example: 10,
        type: Number,
        minimum: 1,
        required: true,
    }),
    (0, class_validator_1.IsNumber)({}, { message: 'La cantidad debe ser un número válido' }),
    (0, class_validator_1.Min)(1, { message: 'La cantidad debe ser mayor a 0' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRequisitionItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Observaciones adicionales sobre el ítem (opcional). Ej: urgente, para proyecto X, etc.',
        example: 'Material urgente para reparación',
        type: String,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Las observaciones deben ser texto' }),
    __metadata("design:type", String)
], CreateRequisitionItemDto.prototype, "observation", void 0);
//# sourceMappingURL=create-requisition-item.dto.js.map