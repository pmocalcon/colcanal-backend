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
exports.CreateRequisitionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const create_requisition_item_dto_1 = require("./create-requisition-item.dto");
class CreateRequisitionDto {
    companyId;
    projectId;
    obra;
    codigoObra;
    items;
}
exports.CreateRequisitionDto = CreateRequisitionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID de la empresa que realiza la requisición. Consulta las empresas disponibles en GET /purchases/master-data/companies\n\n' +
            '**Empresas principales:**\n' +
            '- 1: Canales & Contactos (requiere projectId)\n' +
            '- 2-8: Uniones Temporales (UT El Cerrito, UT Circasia, etc.)',
        example: 1,
        type: Number,
        required: true,
    }),
    (0, class_validator_1.IsNumber)({}, { message: 'El companyId debe ser un número válido' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRequisitionDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID del proyecto asociado (requerido para Canales & Contactos, opcional para otras empresas). Consulta los proyectos en GET /purchases/master-data/projects\n\n' +
            '**Proyectos de Canales & Contactos (companyId: 1):**\n' +
            '- 1: Administrativo (Prefijo: ADM)\n' +
            '- 2: Ciudad Bolívar (Prefijo: CB)\n' +
            '- 3: Jericó (Prefijo: JE)\n' +
            '- 4: Pueblo Rico (Prefijo: PR)\n' +
            '- 5: Tarso (Prefijo: TA)',
        example: 2,
        type: Number,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'El projectId debe ser un número válido' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRequisitionDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nombre de la obra (campo opcional, alfanumérico)',
        example: 'Obra Principal - Sector Norte',
        type: String,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'La obra debe ser una cadena de texto' }),
    __metadata("design:type", String)
], CreateRequisitionDto.prototype, "obra", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Código de la obra (campo opcional, alfanumérico)',
        example: 'OB-2025-001',
        type: String,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'El código de obra debe ser una cadena de texto' }),
    __metadata("design:type", String)
], CreateRequisitionDto.prototype, "codigoObra", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Lista de materiales a solicitar. Debe incluir al menos un ítem. Cada ítem debe tener materialId, quantity y opcionalmente observation.',
        type: [create_requisition_item_dto_1.CreateRequisitionItemDto],
        isArray: true,
        minItems: 1,
        example: [
            {
                materialId: 1,
                quantity: 10,
                observation: 'Cable #10 para instalación principal',
            },
            {
                materialId: 3,
                quantity: 5,
                observation: 'Breakers para tablero secundario',
            },
        ],
    }),
    (0, class_validator_1.IsArray)({ message: 'Los ítems deben ser un array' }),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'Debe incluir al menos un ítem' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_requisition_item_dto_1.CreateRequisitionItemDto),
    __metadata("design:type", Array)
], CreateRequisitionDto.prototype, "items", void 0);
//# sourceMappingURL=create-requisition.dto.js.map