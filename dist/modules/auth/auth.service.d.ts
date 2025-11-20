import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Gestion } from '../../database/entities/gestion.entity';
import { RoleGestion } from '../../database/entities/role-gestion.entity';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private userRepository;
    private gestionRepository;
    private roleGestionRepository;
    private jwtService;
    private configService;
    constructor(userRepository: Repository<User>, gestionRepository: Repository<Gestion>, roleGestionRepository: Repository<RoleGestion>, jwtService: JwtService, configService: ConfigService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            userId: number;
            email: string;
            nombre: string;
            cargo: string;
            rolId: number;
            nombreRol: string;
        };
    }>;
    refreshToken(user: User): Promise<{
        accessToken: string;
    }>;
    getProfile(userId: number): Promise<{
        userId: number;
        email: string;
        nombre: string;
        cargo: string;
        rolId: number;
        estado: boolean;
        creadoEn: Date;
        role: import("../../database/entities").Role;
        authorizationsGranted: import("../../database/entities").Authorization[];
        authorizationsReceived: import("../../database/entities").Authorization[];
    }>;
    getUserModules(userId: number): Promise<{
        gestionId: number;
        nombre: string;
        slug: string;
        icono: string;
        hasAccess: boolean;
    }[]>;
}
