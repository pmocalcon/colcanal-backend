import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "../../database/entities/user.entity";
import { Gestion } from "../../database/entities/gestion.entity";
import { RoleGestion } from "../../database/entities/role-gestion.entity";
import { RolePermission } from "../../database/entities/role-permission.entity";
import { RoleGestionPermission } from "../../database/entities/role-gestion-permission.entity";
import { LoginDto } from "./dto/login.dto";
import {
  ChangePasswordDto,
  PASSWORD_REGEX,
  PASSWORD_RULE_MSG,
} from "./dto/change-password.dto";

// Constantes para los IDs de permisos (basado en tabla permisos)
const PERMISO_IDS = {
  VER: 1,
  CREAR: 2,
  REVISAR: 3,
  APROBAR: 4,
  AUTORIZAR: 5,
  COTIZAR: 6,
  EXPORTAR: 7,
  VALIDAR: 8,
} as const;

// Mapa de slug de gestión → prefijo usado en permisos granulares del frontend
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

// Mapa de ID de permiso → acciones granulares que otorga
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

// Bloqueo de cuenta por intentos fallidos consecutivos.
const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Gestion)
    private gestionRepository: Repository<Gestion>,
    @InjectRepository(RoleGestion)
    private roleGestionRepository: Repository<RoleGestion>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(RoleGestionPermission)
    private roleGestionPermissionRepository: Repository<RoleGestionPermission>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async buildPermissions(rolId: number): Promise<string[]> {
    // Modelo por módulo (matriz rol × módulo × permiso). Si el rol ya tiene filas
    // aquí, manda esto: permite Aprobar en Compras y solo Ver en Usuarios.
    const modPerms = await this.roleGestionPermissionRepository.find({
      where: { rolId },
      relations: ["gestion", "permission"],
    });
    if (modPerms.length > 0) {
      const perms = new Set<string>();
      for (const mp of modPerms) {
        const prefix =
          GESTION_PERMISSION_PREFIX[mp.gestion.slug] ?? mp.gestion.slug;
        const actions = PERMISO_ACTIONS[mp.permisoId];
        if (actions) {
          for (const action of actions) perms.add(`${prefix}:${action}`);
        } else {
          // Permiso no estándar: se emite con su nombre directo.
          perms.add(mp.permission.nombrePermiso);
        }
      }
      return [...perms];
    }

    // Fallback al modelo global (permiso × todos los módulos del rol) mientras el
    // backfill a la tabla por módulo no se haya corrido. No rompe a nadie.
    const [roleGestiones, rolePermisos] = await Promise.all([
      this.roleGestionRepository.find({ where: { rolId }, relations: ['gestion'] }),
      this.rolePermissionRepository.find({ where: { rolId }, relations: ['permission'] }),
    ]);

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

    // Permisos específicos (nombre_permiso directo) que no están en PERMISO_ACTIONS
    const knownPermisoIds = new Set(Object.keys(PERMISO_ACTIONS).map(Number));
    for (const rp of rolePermisos) {
      if (!knownPermisoIds.has(rp.permisoId)) {
        permissions.push(rp.permission.nombrePermiso);
      }
    }

    return [...new Set(permissions)];
  }

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      // Validate corporate email domain
      const allowedDomains = [
        "@canalco.com",
        "@alumbrado.com",
        "@canalcongroup.com",
      ];
      const emailDomain = "@" + email.split("@")[1];

      if (!allowedDomains.includes(emailDomain)) {
        throw new BadRequestException(
          `El correo electrónico corporativo debe terminar en ${allowedDomains.join(", ")}`,
        );
      }

      // Find user with role
      const user = await this.userRepository.findOne({
        where: { email },
        relations: ["role"],
      });

      if (!user) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Check if user is active
      if (!user.estado) {
        throw new UnauthorizedException("User account is inactive");
      }

      // Cuenta bloqueada por intentos fallidos: no se prueba la contraseña.
      if (user.bloqueadoHasta && user.bloqueadoHasta.getTime() > Date.now()) {
        const minutos = Math.ceil(
          (user.bloqueadoHasta.getTime() - Date.now()) / 60000,
        );
        throw new UnauthorizedException(
          `Cuenta bloqueada por intentos fallidos. Intenta de nuevo en ${minutos} minuto(s).`,
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // Suma un intento fallido; al llegar al tope, bloquea temporalmente.
        const intentos = (user.intentosFallidos ?? 0) + 1;
        const bloquea = intentos >= MAX_INTENTOS;
        await this.userRepository.update(user.userId, {
          intentosFallidos: bloquea ? 0 : intentos,
          ...(bloquea
            ? {
                bloqueadoHasta: new Date(
                  Date.now() + BLOQUEO_MINUTOS * 60000,
                ),
              }
            : {}),
        });
        if (bloquea) {
          throw new UnauthorizedException(
            `Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos tras ${MAX_INTENTOS} intentos fallidos.`,
          );
        }
        throw new UnauthorizedException("Invalid credentials");
      }

      // Cuentas exentas (p. ej. la representante legal) nunca se fuerzan a
      // cambiar la clave temporal, aunque su fila lo pida.
      const exentos: string[] =
        this.configService.get("passwordExemptEmails") || [];
      const debeCambiar =
        !!user.debeCambiarPassword && !exentos.includes(email.toLowerCase());

      // Generate tokens
      const permissions = await this.buildPermissions(user.rolId);
      const payload = {
        sub: user.userId,
        email: user.email,
        roleId: user.rolId,
        roleName: user.role.nombreRol,
        permissions,
      };
      const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.get("jwt.secret") || "change-this-secret",
        expiresIn: `${this.configService.get("jwt.expiresIn") || 3600}s`,
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret:
          this.configService.get("jwt.refreshSecret") ||
          "change-this-refresh-secret",
        expiresIn: `${this.configService.get("jwt.refreshExpiresIn") || 604800}s`,
      });

      // Hash and store refresh token. De paso: sella el último acceso y
      // limpia el contador de intentos y cualquier bloqueo previo.
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      await this.userRepository.update(user.userId, {
        refreshToken: hashedRefreshToken,
        ultimoAcceso: new Date(),
        intentosFallidos: 0,
        bloqueadoHasta: null as unknown as Date,
      });

      return {
        accessToken,
        refreshToken,
        user: {
          userId: user.userId,
          email: user.email,
          nombre: user.nombre,
          cargo: user.cargo,
          rolId: user.rolId,
          nombreRol: user.role.nombreRol,
          debeCambiarPassword: debeCambiar,
        },
      };
    } catch (error) {
      // If it's already an HTTP exception, re-throw it
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // For any other error, throw a generic BadRequestException
      throw new BadRequestException("An error occurred during login");
    }
  }

  /**
   * Cambio de contraseña por el propio usuario. Exige la clave actual,
   * verifica robustez, y baja la bandera debeCambiarPassword. Nunca
   * permite repetir la misma contraseña.
   */
  async cambiarPassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const actualValida = await bcrypt.compare(dto.passwordActual, user.password);
    if (!actualValida) {
      throw new BadRequestException("La contraseña actual no es correcta");
    }

    if (!PASSWORD_REGEX.test(dto.passwordNueva)) {
      throw new BadRequestException(PASSWORD_RULE_MSG);
    }

    const esLaMisma = await bcrypt.compare(dto.passwordNueva, user.password);
    if (esLaMisma) {
      throw new BadRequestException(
        "La nueva contraseña debe ser distinta de la actual",
      );
    }

    const hashed = await bcrypt.hash(dto.passwordNueva, 10);
    await this.userRepository.update(userId, {
      password: hashed,
      debeCambiarPassword: false,
    });

    return { message: "Contraseña actualizada correctamente" };
  }

  /**
   * Impersonación para pruebas: emite tokens del usuario destino sin conocer ni
   * tocar su contraseña, y sin sobrescribir su refresh token (no interrumpe su
   * sesión real). El token lleva marca de quién impersona, para auditoría. El
   * control de que quien llama sea administrador se hace en el controlador.
   */
  async impersonar(
    targetUserId: number,
    admin: { userId: number; email: string },
  ) {
    const target = await this.userRepository.findOne({
      where: { userId: targetUserId },
      relations: ["role"],
    });
    if (!target) {
      throw new UnauthorizedException("Usuario a impersonar no encontrado");
    }
    if (!target.estado) {
      throw new BadRequestException("La cuenta a impersonar está inactiva");
    }

    const permissions = await this.buildPermissions(target.rolId);
    const payload = {
      sub: target.userId,
      email: target.email,
      roleId: target.rolId,
      roleName: target.role.nombreRol,
      permissions,
      impersonatedBy: admin.userId,
      impersonatorEmail: admin.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get("jwt.secret") || "change-this-secret",
      expiresIn: `${this.configService.get("jwt.expiresIn") || 3600}s`,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get("jwt.refreshSecret") ||
        "change-this-refresh-secret",
      expiresIn: `${this.configService.get("jwt.refreshExpiresIn") || 604800}s`,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userId: target.userId,
        email: target.email,
        nombre: target.nombre,
        cargo: target.cargo,
        rolId: target.rolId,
        nombreRol: target.role.nombreRol,
        // Impersonando no se fuerza el cambio de clave del otro.
        debeCambiarPassword: false,
      },
      impersonatedBy: {
        userId: admin.userId,
        email: admin.email,
      },
    };
  }

  async refreshToken(user: User) {
    const userWithRole = await this.userRepository.findOne({
      where: { userId: user.userId },
      relations: ['role'],
    });

    if (!userWithRole) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = await this.buildPermissions(userWithRole.rolId);
    const payload = {
      sub: userWithRole.userId,
      email: userWithRole.email,
      roleId: userWithRole.rolId,
      roleName: userWithRole.role.nombreRol,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get("jwt.secret"),
      expiresIn: `${this.configService.get("jwt.expiresIn")}s`,
    });

    const newRefreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get("jwt.refreshSecret") || "change-this-refresh-secret",
      expiresIn: `${this.configService.get("jwt.refreshExpiresIn") || 604800}s`,
    });

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.userRepository.update(userWithRole.userId, { refreshToken: hashedRefreshToken });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ["role"],
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const { password, refreshToken, ...userWithoutSensitiveData } = user;

    return userWithoutSensitiveData;
  }

  async getMyPermissions(userId: number) {
    // Get user with role
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Get role permissions (granular permissions)
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { rolId: user.rolId },
      relations: ['permission'],
    });

    const permissions = rolePermissions.map(rp => rp.permission.nombrePermiso);

    return { permissions };
  }

  async getUserModules(userId: number) {
    // Get user with role
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ["role"],
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Get all gestiones (modules)
    const allGestiones = await this.gestionRepository.find({
      order: { gestionId: "ASC" },
    });

    // Get role gestiones for this user's role
    const roleGestiones = await this.roleGestionRepository.find({
      where: { rolId: user.rolId },
    });

    // Get role permissions for this user's role
    const rolePermisos = await this.rolePermissionRepository.find({
      where: { rolId: user.rolId },
    });

    // Create a set of gestionIds that the role has access to
    const allowedGestionIds = new Set(roleGestiones.map((rg) => rg.gestionId));

    // Create a set of permisoIds that the role has
    const allowedPermisoIds = new Set(rolePermisos.map((rp) => rp.permisoId));

    // Build permissions object
    const permisos = {
      ver: allowedPermisoIds.has(PERMISO_IDS.VER),
      crear: allowedPermisoIds.has(PERMISO_IDS.CREAR),
      revisar: allowedPermisoIds.has(PERMISO_IDS.REVISAR),
      aprobar: allowedPermisoIds.has(PERMISO_IDS.APROBAR),
      autorizar: allowedPermisoIds.has(PERMISO_IDS.AUTORIZAR),
      cotizar: allowedPermisoIds.has(PERMISO_IDS.COTIZAR),
      exportar: allowedPermisoIds.has(PERMISO_IDS.EXPORTAR),
      validar: allowedPermisoIds.has(PERMISO_IDS.VALIDAR),
    };

    // Map all gestiones and mark which ones are accessible
    return allGestiones.map((gestion) => ({
      gestionId: gestion.gestionId,
      nombre: gestion.nombre,
      slug: gestion.slug,
      icono: gestion.icono,
      hasAccess: allowedGestionIds.has(gestion.gestionId),
      permisos,
    }));
  }
}
