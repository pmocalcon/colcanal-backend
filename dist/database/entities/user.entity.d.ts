import { Role } from './role.entity';
import { Authorization } from './authorization.entity';
export declare class User {
    userId: number;
    email: string;
    password: string;
    nombre: string;
    cargo: string;
    rolId: number;
    estado: boolean;
    creadoEn: Date;
    refreshToken: string;
    role: Role;
    authorizationsGranted: Authorization[];
    authorizationsReceived: Authorization[];
}
