"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("../../database/entities/user.entity");
const gestion_entity_1 = require("../../database/entities/gestion.entity");
const role_gestion_entity_1 = require("../../database/entities/role-gestion.entity");
let AuthService = class AuthService {
    userRepository;
    gestionRepository;
    roleGestionRepository;
    jwtService;
    configService;
    constructor(userRepository, gestionRepository, roleGestionRepository, jwtService, configService) {
        this.userRepository = userRepository;
        this.gestionRepository = gestionRepository;
        this.roleGestionRepository = roleGestionRepository;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async login(loginDto) {
        try {
            const { email, password } = loginDto;
            const corporateDomain = this.configService.get('corporateEmailDomain') ||
                '@canalco.com';
            if (!email.endsWith(corporateDomain)) {
                throw new common_1.BadRequestException(`Email must be from ${corporateDomain} domain`);
            }
            const user = await this.userRepository.findOne({
                where: { email },
                relations: ['role'],
            });
            if (!user) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            if (!user.estado) {
                throw new common_1.UnauthorizedException('User account is inactive');
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const payload = { sub: user.userId, email: user.email };
            const accessToken = this.jwtService.sign(payload, {
                secret: this.configService.get('jwt.secret') || 'change-this-secret',
                expiresIn: `${this.configService.get('jwt.expiresIn') || 3600}s`,
            });
            const refreshToken = this.jwtService.sign(payload, {
                secret: this.configService.get('jwt.refreshSecret') ||
                    'change-this-refresh-secret',
                expiresIn: `${this.configService.get('jwt.refreshExpiresIn') || 604800}s`,
            });
            const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
            await this.userRepository.update(user.userId, {
                refreshToken: hashedRefreshToken,
            });
            return {
                accessToken,
                refreshToken,
                user: {
                    userId: user.userId,
                    email: user.email,
                    nombre: user.nombre,
                    cargo: user.cargo,
                    rolId: user.rolId,
                    nombreRol: user.role.nombreRol,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('An error occurred during login');
        }
    }
    async refreshToken(user) {
        const payload = { sub: user.userId, email: user.email };
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.secret'),
            expiresIn: `${this.configService.get('jwt.expiresIn')}s`,
        });
        return {
            accessToken,
        };
    }
    async getProfile(userId) {
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const { password, refreshToken, ...userWithoutSensitiveData } = user;
        return userWithoutSensitiveData;
    }
    async getUserModules(userId) {
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['role'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const allGestiones = await this.gestionRepository.find({
            order: { gestionId: 'ASC' },
        });
        const roleGestiones = await this.roleGestionRepository.find({
            where: { rolId: user.rolId },
        });
        const allowedGestionIds = new Set(roleGestiones.map((rg) => rg.gestionId));
        return allGestiones.map((gestion) => ({
            gestionId: gestion.gestionId,
            nombre: gestion.nombre,
            slug: gestion.slug,
            icono: gestion.icono,
            hasAccess: allowedGestionIds.has(gestion.gestionId),
        }));
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(gestion_entity_1.Gestion)),
    __param(2, (0, typeorm_1.InjectRepository)(role_gestion_entity_1.RoleGestion)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map