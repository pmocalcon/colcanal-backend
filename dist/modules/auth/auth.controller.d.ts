import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from '../../database/entities/user.entity';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    refresh(user: User, refreshTokenDto: RefreshTokenDto): Promise<{
        accessToken: string;
    }>;
    getProfile(user: User): Promise<{
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
    getUserModules(user: User): Promise<{
        gestionId: number;
        nombre: string;
        slug: string;
        icono: string;
        hasAccess: boolean;
    }[]>;
}
