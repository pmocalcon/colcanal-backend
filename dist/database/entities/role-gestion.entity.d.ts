import { Role } from './role.entity';
import { Gestion } from './gestion.entity';
export declare class RoleGestion {
    id: number;
    rolId: number;
    gestionId: number;
    role: Role;
    gestion: Gestion;
}
