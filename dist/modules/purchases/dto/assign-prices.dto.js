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
exports.AssignPricesDto = exports.ItemPriceDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ItemPriceDto {
    itemId;
    quotationId;
    unitPrice;
    hasIva;
    discount;
}
exports.ItemPriceDto = ItemPriceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID del ítem de la requisición',
        example: 1,
    }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ItemPriceDto.prototype, "itemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID de la cotización (quotation) seleccionada para este ítem',
        example: 5,
        required: false,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ItemPriceDto.prototype, "quotationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Precio unitario sin IVA',
        example: 150000,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ItemPriceDto.prototype, "unitPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Indica si el ítem tiene IVA del 19%',
        example: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ItemPriceDto.prototype, "hasIva", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Descuento aplicado al ítem',
        example: 5000,
        required: false,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ItemPriceDto.prototype, "discount", void 0);
class AssignPricesDto {
    items;
}
exports.AssignPricesDto = AssignPricesDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Array de ítems con sus precios asignados',
        type: [ItemPriceDto],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ItemPriceDto),
    __metadata("design:type", Array)
], AssignPricesDto.prototype, "items", void 0);
//# sourceMappingURL=assign-prices.dto.js.map