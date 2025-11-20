import { Role } from './role.entity';
import { Permission } from './permission.entity';
export declare class RolePermission {
    id: number;
    rolId: number;
    permisoId: number;
    role: Role;
    permission: Permission;
}
