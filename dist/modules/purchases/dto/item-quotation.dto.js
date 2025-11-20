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
exports.ItemQuotationDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const supplier_quotation_dto_1 = require("./supplier-quotation.dto");
class ItemQuotationDto {
    itemId;
    action;
    suppliers;
    justification;
}
exports.ItemQuotationDto = ItemQuotationDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ItemQuotationDto.prototype, "itemId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['cotizar', 'no_requiere']),
    __metadata("design:type", String)
], ItemQuotationDto.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.action === 'cotizar'),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'Debe seleccionar al menos un proveedor' }),
    (0, class_validator_1.ArrayMaxSize)(2, { message: 'Máximo 2 proveedores por ítem' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => supplier_quotation_dto_1.SupplierQuotationDto),
    __metadata("design:type", Array)
], ItemQuotationDto.prototype, "suppliers", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.action === 'no_requiere'),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ItemQuotationDto.prototype, "justification", void 0);
//# sourceMappingURL=item-quotation.dto.js.map