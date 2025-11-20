import { RolePermission } from './role-permission.entity';
export declare class Permission {
    permisoId: number;
    nombrePermiso: string;
    descripcion: string;
    rolePermissions: RolePermission[];
}
