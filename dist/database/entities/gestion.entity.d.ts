import { RoleGestion } from './role-gestion.entity';
import { Authorization } from './authorization.entity';
export declare class Gestion {
    gestionId: number;
    nombre: string;
    slug: string;
    icono: string;
    roleGestiones: RoleGestion[];
    authorizations: Authorization[];
}
