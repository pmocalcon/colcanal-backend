import { User } from './user.entity';
import { RolePermission } from './role-permission.entity';
import { RoleGestion } from './role-gestion.entity';
export declare class Role {
    rolId: number;
    nombreRol: string;
    descripcion: string;
    category: string;
    defaultModule: string;
    users: User[];
    rolePermissions: RolePermission[];
    roleGestiones: RoleGestion[];
}
