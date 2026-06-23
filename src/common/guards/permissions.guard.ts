import { Injectable, CanActivate, ExecutionContext, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { RolePermission } from "../../database/entities/role-permission.entity";
import { RoleGestion } from "../../database/entities/role-gestion.entity";

const GESTION_PERMISSION_PREFIX: Record<string, string> = {
  'levantamiento-obras': 'levantamientos',
  'compras': 'compras',
  'materiales': 'materiales',
  'usuarios': 'usuarios',
  'proveedores': 'proveedores',
  'auditorias': 'auditorias',
  'notificaciones': 'notificaciones',
  'dashboard': 'dashboard',
};

const PERMISO_ACTIONS: Record<number, string[]> = {
  1: ['ver'],
  2: ['crear', 'editar'],
  3: ['revisar'],
  4: ['aprobar'],
  5: ['autorizar'],
  6: ['cotizar'],
  7: ['exportar'],
  8: ['validar'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);
  private readonly permissionCache = new Map<number, { permissions: string[]; expiresAt: number }>();
  private readonly cacheTtlMs = 5 * 60 * 1000;

  constructor(
    private reflector: Reflector,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(RoleGestion)
    private roleGestionRepository: Repository<RoleGestion>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      return false;
    }

    const rolId = user.role.rolId;

    const permissions = await this.getPermissionsForRole(rolId);

    return requiredPermissions.some((permission) =>
      permissions.includes(permission),
    );
  }

  private async getPermissionsForRole(rolId: number): Promise<string[]> {
    const now = Date.now();
    const cached = this.permissionCache.get(rolId);
    if (cached && cached.expiresAt > now) {
      return cached.permissions;
    }

    let rolePermisos: RolePermission[];
    let roleGestiones: RoleGestion[];
    try {
      [rolePermisos, roleGestiones] = await Promise.all([
        this.rolePermissionRepository.find({ where: { rolId }, relations: ['permission'] }),
        this.roleGestionRepository.find({ where: { rolId }, relations: ['gestion'] }),
      ]);
    } catch (error) {
      if (cached) {
        this.logger.warn(
          `No se pudieron refrescar permisos del rol ${rolId}. Se usara cache anterior.`,
          error instanceof Error ? error.stack : String(error),
        );
        return cached.permissions;
      }
      throw error;
    }

    const permisoIds = new Set(rolePermisos.map((rp) => rp.permisoId));
    const permissions: string[] = [];

    for (const rg of roleGestiones) {
      const prefix = GESTION_PERMISSION_PREFIX[rg.gestion.slug] ?? rg.gestion.slug;
      for (const [permisoId, actions] of Object.entries(PERMISO_ACTIONS)) {
        if (permisoIds.has(Number(permisoId))) {
          for (const action of actions) {
            permissions.push(`${prefix}:${action}`);
          }
        }
      }
    }

    const knownPermisoIds = new Set(Object.keys(PERMISO_ACTIONS).map(Number));
    for (const rp of rolePermisos) {
      if (!knownPermisoIds.has(rp.permisoId)) {
        permissions.push(rp.permission.nombrePermiso);
      }
    }

    this.permissionCache.set(rolId, {
      permissions,
      expiresAt: now + this.cacheTtlMs,
    });

    return permissions;
  }
}
