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
exports.CreateInvoiceDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateInvoiceDto {
    purchaseOrderId;
    invoiceNumber;
    issueDate;
    amount;
    materialQuantity;
}
exports.CreateInvoiceDto = CreateInvoiceDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'El ID de la orden de compra es requerido' }),
    (0, class_validator_1.IsNumber)({}, { message: 'El ID de la orden de compra debe ser un número' }),
    __metadata("design:type", Number)
], CreateInvoiceDto.prototype, "purchaseOrderId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'El número de factura es requerido' }),
    (0, class_validator_1.IsString)({ message: 'El número de factura debe ser un texto' }),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "invoiceNumber", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'La fecha de emisión es requerida' }),
    (0, class_validator_1.IsDateString)({}, { message: 'La fecha de emisión debe ser una fecha válida' }),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "issueDate", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'El monto es requerido' }),
    (0, class_validator_1.IsNumber)({}, { message: 'El monto debe ser un número' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0.01, { message: 'El monto debe ser mayor a 0' }),
    __metadata("design:type", Number)
], CreateInvoiceDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'La cantidad de material es requerida' }),
    (0, class_validator_1.IsNumber)({}, { message: 'La cantidad de material debe ser un número' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0.01, { message: 'La cantidad debe ser mayor a 0' }),
    __metadata("design:type", Number)
], CreateInvoiceDto.prototype, "materialQuantity", void 0);
//# sourceMappingURL=create-invoice.dto.js.map