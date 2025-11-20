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
exports.FilterRequisitionsDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class FilterRequisitionsDto {
    page;
    limit;
    status;
    fromDate;
    toDate;
    projectId;
}
exports.FilterRequisitionsDto = FilterRequisitionsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Número de página para la paginación (comienza en 1)',
        example: 1,
        type: Number,
        required: false,
        default: 1,
        minimum: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], FilterRequisitionsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cantidad máxima de requisiciones a retornar por página (máximo recomendado: 100)',
        example: 10,
        type: Number,
        required: false,
        default: 10,
        minimum: 1,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], FilterRequisitionsDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Filtrar requisiciones por estado. Estados disponibles:\n' +
            '- **pendiente**: Requisición creada, esperando revisión\n' +
            '- **aprobada_revisor**: Aprobada por Director (Nivel 1)\n' +
            '- **rechazada_revisor**: Rechazada por Director\n' +
            '- **aprobada_gerencia**: Aprobada por Gerencia (Nivel 2)\n' +
            '- **rechazada_gerencia**: Rechazada por Gerencia\n' +
            '- **en_proceso**: En proceso de compra\n' +
            '- **completada**: Completada',
        example: 'pendiente',
        type: String,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'El estado debe ser texto' }),
    __metadata("design:type", String)
], FilterRequisitionsDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Fecha inicial del rango de búsqueda (formato ISO 8601: YYYY-MM-DD). Filtra requisiciones creadas desde esta fecha.',
        example: '2025-01-01',
        type: String,
        format: 'date',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'La fecha debe estar en formato ISO 8601' }),
    __metadata("design:type", String)
], FilterRequisitionsDto.prototype, "fromDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Fecha final del rango de búsqueda (formato ISO 8601: YYYY-MM-DD). Filtra requisiciones creadas hasta esta fecha.',
        example: '2025-12-31',
        type: String,
        format: 'date',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'La fecha debe estar en formato ISO 8601' }),
    __metadata("design:type", String)
], FilterRequisitionsDto.prototype, "toDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Filtrar requisiciones por proyecto específico. Útil para ver todas las requisiciones de un proyecto (ej: Ciudad Bolívar, Jericó, etc.)',
        example: 2,
        type: Number,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], FilterRequisitionsDto.prototype, "projectId", void 0);
//# sourceMappingURL=filter-requisitions.dto.js.map