import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { RolePermission } from '../../database/entities/role-permission.entity';
export declare class PermissionsGuard implements CanActivate {
    private reflector;
    private rolePermissionRepository;
    constructor(reflector: Reflector, rolePermissionRepository: Repository<RolePermission>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
