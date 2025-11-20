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
exports.LoginResponseDto = exports.UserResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class UserResponseDto {
    userId;
    email;
    nombre;
    cargo;
    rolId;
    nombreRol;
}
exports.UserResponseDto = UserResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID único del usuario en la base de datos',
        example: 1,
        type: Number,
    }),
    __metadata("design:type", Number)
], UserResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Correo electrónico corporativo del usuario',
        example: 'admin@canalco.com',
        type: String,
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nombre completo del usuario',
        example: 'Juan Carlos Rodríguez',
        type: String,
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "nombre", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cargo del usuario en la organización',
        example: 'Gerente de Compras',
        type: String,
        required: false,
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "cargo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID del rol asignado al usuario',
        example: 1,
        type: Number,
    }),
    __metadata("design:type", Number)
], UserResponseDto.prototype, "rolId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nombre del rol (Gerencia, Director PMO, Analista PMO, PQRS, Compras, etc.)',
        example: 'Gerencia',
        type: String,
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "nombreRol", void 0);
class LoginResponseDto {
    accessToken;
    refreshToken;
    user;
}
exports.LoginResponseDto = LoginResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Token de acceso JWT. Válido por 1 hora. Usar este token en el header Authorization: Bearer {token} para autenticar las peticiones',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AY2FuYWxjby5jb20iLCJpYXQiOjE3NjIzMTEwMjAsImV4cCI6MTc2MjMxNDYyMH0.7FQLE4qVQoAGgmsiW0kzzbG3P6LVT5Zd9iJrehi1ohc',
        type: String,
    }),
    __metadata("design:type", String)
], LoginResponseDto.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Token de refresco JWT. Válido por 7 días. Usar este token para obtener un nuevo accessToken cuando expire usando el endpoint /auth/refresh',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AY2FuYWxjby5jb20iLCJpYXQiOjE3NjIzMTEwMjAsImV4cCI6MTc2MjkxNTgyMH0.iW4VdqdCqO6Wccp4esSDtimQNyGHSOAG7BOYy5aWEQQ',
        type: String,
    }),
    __metadata("design:type", String)
], LoginResponseDto.prototype, "refreshToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Información completa del usuario autenticado',
        type: UserResponseDto,
    }),
    __metadata("design:type", UserResponseDto)
], LoginResponseDto.prototype, "user", void 0);
//# sourceMappingURL=login-response.dto.js.map