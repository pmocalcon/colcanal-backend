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
exports.UpdateMaterialReceiptDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateMaterialReceiptDto {
    quantityReceived;
    receivedDate;
    observations;
    overdeliveryJustification;
}
exports.UpdateMaterialReceiptDto = UpdateMaterialReceiptDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nueva cantidad recibida',
        required: false,
        example: 8,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01, { message: 'La cantidad debe ser mayor a 0' }),
    __metadata("design:type", Number)
], UpdateMaterialReceiptDto.prototype, "quantityReceived", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nueva fecha de recepción (YYYY-MM-DD)',
        required: false,
        example: '2025-11-07',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateMaterialReceiptDto.prototype, "receivedDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nuevas observaciones',
        required: false,
        example: 'Material revisado y almacenado',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMaterialReceiptDto.prototype, "observations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nueva justificación de sobreentrega (solo si aplica)',
        required: false,
        example: 'Proveedor corrigió el envío',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMaterialReceiptDto.prototype, "overdeliveryJustification", void 0);
//# sourceMappingURL=update-material-receipt.dto.js.map