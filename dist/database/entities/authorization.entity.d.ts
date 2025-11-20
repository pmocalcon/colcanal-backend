import { User } from './user.entity';
import { Gestion } from './gestion.entity';
export declare class Authorization {
    id: number;
    usuarioAutorizadorId: number;
    usuarioAutorizadoId: number;
    gestionId: number;
    tipoAutorizacion: string;
    nivel: number;
    esActivo: boolean;
    usuarioAutorizador: User;
    usuarioAutorizado: User;
    gestion: Gestion;
}
