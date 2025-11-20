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
exports.CreateMaterialReceiptDto = exports.ReceiptItemDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ReceiptItemDto {
    poItemId;
    quantityReceived;
    receivedDate;
    observations;
    overdeliveryJustification;
}
exports.ReceiptItemDto = ReceiptItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID del ítem de la orden de compra (po_item_id)',
        example: 1,
    }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], ReceiptItemDto.prototype, "poItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cantidad recibida',
        example: 5.5,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01, { message: 'La cantidad debe ser mayor a 0' }),
    __metadata("design:type", Number)
], ReceiptItemDto.prototype, "quantityReceived", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Fecha de recepción (YYYY-MM-DD)',
        example: '2025-11-06',
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ReceiptItemDto.prototype, "receivedDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Observaciones de la recepción',
        required: false,
        example: 'Material en buen estado',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReceiptItemDto.prototype, "observations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Justificación si se recibió más de lo pendiente (sobreentrega)',
        required: false,
        example: 'El proveedor envió de más por error en despacho',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReceiptItemDto.prototype, "overdeliveryJustification", void 0);
class CreateMaterialReceiptDto {
    items;
}
exports.CreateMaterialReceiptDto = CreateMaterialReceiptDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Lista de ítems a registrar como recibidos',
        type: [ReceiptItemDto],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'Debe registrar al menos un ítem' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ReceiptItemDto),
    __metadata("design:type", Array)
], CreateMaterialReceiptDto.prototype, "items", void 0);
//# sourceMappingURL=create-material-receipt.dto.js.map