import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { Authorization } from '../../database/entities/authorization.entity';
import { Permission } from '../../database/entities/permission.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { Gestion } from '../../database/entities/gestion.entity';

import { CreateUserDto, UpdateUserDto, CreateAuthorizationDto, BulkAuthorizationDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Authorization)
    private authorizationRepository: Repository<Authorization>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Gestion)
    private gestionRepository: Repository<Gestion>,
  ) {}

  // ============================================
  // CRUD DE USUARIOS
  // ============================================

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { estado: true };

    const users = await this.userRepository.find({
      where,
      relations: ['role'],
      order: { nombre: 'ASC' },
    });

    return users.map(user => this.sanitizeUser(user));
  }

  async findOne(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role', 'authorizationsGranted', 'authorizationsReceived'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    return this.sanitizeUser(user);
  }

  async findByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con email ${email} no encontrado`);
    }

    return this.sanitizeUser(user);
  }

  async create(createUserDto: CreateUserDto) {
    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(`Ya existe un usuario con el email ${createUserDto.email}`);
    }

    // Verificar que el rol existe
    const role = await this.roleRepository.findOne({
      where: { rolId: createUserDto.rolId },
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${createUserDto.rolId} no encontrado`);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Crear usuario
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      estado: createUserDto.estado ?? true,
    });

    const savedUser = await this.userRepository.save(user);

    // Retornar usuario con rol
    return this.findOne(savedUser.userId);
  }

  async update(userId: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Si se actualiza el email, verificar que no exista
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException(`Ya existe un usuario con el email ${updateUserDto.email}`);
      }
    }

    // Si se actualiza el rol, verificar que existe
    if (updateUserDto.rolId) {
      const role = await this.roleRepository.findOne({
        where: { rolId: updateUserDto.rolId },
      });

      if (!role) {
        throw new NotFoundException(`Rol con ID ${updateUserDto.rolId} no encontrado`);
      }
    }

    // Si se actualiza la contraseña, hashearla
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Actualizar usuario
    await this.userRepository.update(userId, updateUserDto);

    return this.findOne(userId);
  }

  async deactivate(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    await this.userRepository.update(userId, { estado: false });

    return { message: `Usuario ${user.nombre} desactivado correctamente` };
  }

  async activate(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    await this.userRepository.update(userId, { estado: true });

    return { message: `Usuario ${user.nombre} activado correctamente` };
  }

  // ============================================
  // GESTIÓN DE ROLES Y PERMISOS
  // ============================================

  async findAllRoles() {
    return this.roleRepository.find({
      relations: ['rolePermissions', 'rolePermissions.permission'],
      order: { rolId: 'ASC' },
    });
  }

  async findAllPermissions() {
    return this.permissionRepository.find({
      order: { permisoId: 'ASC' },
    });
  }

  async getRolePermissions(rolId: number) {
    const role = await this.roleRepository.findOne({
      where: { rolId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${rolId} no encontrado`);
    }

    return {
      role: {
        rolId: role.rolId,
        nombreRol: role.nombreRol,
        descripcion: role.descripcion,
      },
      permissions: role.rolePermissions.map(rp => ({
        permisoId: rp.permission.permisoId,
        nombrePermiso: rp.permission.nombrePermiso,
        descripcion: rp.permission.descripcion,
      })),
    };
  }

  // ============================================
  // GESTIÓN DE AUTORIZACIONES
  // ============================================

  async getUserAuthorizations(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Obtener autorizaciones otorgadas (usuarios que puede revisar/aprobar)
    const authorizationsGranted = await this.authorizationRepository.find({
      where: { usuarioAutorizadorId: userId, esActivo: true },
      relations: ['usuarioAutorizado', 'gestion'],
    });

    // Obtener autorizaciones recibidas (quién lo puede revisar/aprobar)
    const authorizationsReceived = await this.authorizationRepository.find({
      where: { usuarioAutorizadoId: userId, esActivo: true },
      relations: ['usuarioAutorizador', 'gestion'],
    });

    return {
      userId,
      nombre: user.nombre,
      // Subordinados (a quienes puede revisar/aprobar)
      subordinados: authorizationsGranted.map(auth => ({
        authorizationId: auth.id,
        usuario: {
          userId: auth.usuarioAutorizado.userId,
          nombre: auth.usuarioAutorizado.nombre,
          cargo: auth.usuarioAutorizado.cargo,
          email: auth.usuarioAutorizado.email,
        },
        tipoAutorizacion: auth.tipoAutorizacion,
        nivel: auth.nivel,
        gestion: auth.gestion ? {
          gestionId: auth.gestion.gestionId,
          nombre: auth.gestion.nombre,
        } : null,
      })),
      // Supervisores (quienes lo pueden revisar/aprobar)
      supervisores: authorizationsReceived.map(auth => ({
        authorizationId: auth.id,
        usuario: {
          userId: auth.usuarioAutorizador.userId,
          nombre: auth.usuarioAutorizador.nombre,
          cargo: auth.usuarioAutorizador.cargo,
          email: auth.usuarioAutorizador.email,
        },
        tipoAutorizacion: auth.tipoAutorizacion,
        nivel: auth.nivel,
        gestion: auth.gestion ? {
          gestionId: auth.gestion.gestionId,
          nombre: auth.gestion.nombre,
        } : null,
      })),
    };
  }

  async createAuthorization(
    usuarioAutorizadorId: number,
    createAuthorizationDto: CreateAuthorizationDto,
  ) {
    // Verificar que el autorizador existe
    const autorizador = await this.userRepository.findOne({
      where: { userId: usuarioAutorizadorId },
    });

    if (!autorizador) {
      throw new NotFoundException(`Usuario autorizador con ID ${usuarioAutorizadorId} no encontrado`);
    }

    // Verificar que el autorizado existe
    const autorizado = await this.userRepository.findOne({
      where: { userId: createAuthorizationDto.usuarioAutorizadoId },
    });

    if (!autorizado) {
      throw new NotFoundException(`Usuario autorizado con ID ${createAuthorizationDto.usuarioAutorizadoId} no encontrado`);
    }

    // No se puede autorizar a sí mismo
    if (usuarioAutorizadorId === createAuthorizationDto.usuarioAutorizadoId) {
      throw new BadRequestException('Un usuario no puede autorizarse a sí mismo');
    }

    // Verificar si la gestión existe (si se especifica)
    if (createAuthorizationDto.gestionId) {
      const gestion = await this.gestionRepository.findOne({
        where: { gestionId: createAuthorizationDto.gestionId },
      });

      if (!gestion) {
        throw new NotFoundException(`Gestión con ID ${createAuthorizationDto.gestionId} no encontrada`);
      }
    }

    // Determinar el nivel basado en el tipo de autorización
    const nivel = this.getNivelFromTipo(createAuthorizationDto.tipoAutorizacion);

    // Verificar si ya existe esta autorización
    const whereCondition: any = {
      usuarioAutorizadorId,
      usuarioAutorizadoId: createAuthorizationDto.usuarioAutorizadoId,
      tipoAutorizacion: createAuthorizationDto.tipoAutorizacion,
    };
    if (createAuthorizationDto.gestionId) {
      whereCondition.gestionId = createAuthorizationDto.gestionId;
    }
    const existingAuth = await this.authorizationRepository.findOne({
      where: whereCondition,
    });

    if (existingAuth) {
      if (existingAuth.esActivo) {
        throw new ConflictException('Esta autorización ya existe');
      }
      // Reactivar autorización existente
      await this.authorizationRepository.update(existingAuth.id, { esActivo: true });
      return this.authorizationRepository.findOne({
        where: { id: existingAuth.id },
        relations: ['usuarioAutorizador', 'usuarioAutorizado', 'gestion'],
      });
    }

    // Crear nueva autorización
    const authData: any = {
      usuarioAutorizadorId,
      usuarioAutorizadoId: createAuthorizationDto.usuarioAutorizadoId,
      tipoAutorizacion: createAuthorizationDto.tipoAutorizacion,
      nivel,
      esActivo: true,
    };
    if (createAuthorizationDto.gestionId) {
      authData.gestionId = createAuthorizationDto.gestionId;
    }
    const authorization = this.authorizationRepository.create(authData);

    const saved = await this.authorizationRepository.save(authorization);
    const savedAuth = Array.isArray(saved) ? saved[0] : saved;

    return this.authorizationRepository.findOne({
      where: { id: savedAuth.id },
      relations: ['usuarioAutorizador', 'usuarioAutorizado', 'gestion'],
    });
  }

  async createBulkAuthorizations(bulkDto: BulkAuthorizationDto) {
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const usuarioAutorizadoId of bulkDto.usuariosAutorizadosIds) {
      try {
        await this.createAuthorization(bulkDto.usuarioAutorizadorId, {
          usuarioAutorizadoId,
          tipoAutorizacion: bulkDto.tipoAutorizacion,
          gestionId: bulkDto.gestionId,
        });
        results.created++;
      } catch (error) {
        if (error instanceof ConflictException) {
          results.skipped++;
        } else {
          results.errors.push(`Usuario ${usuarioAutorizadoId}: ${error.message}`);
        }
      }
    }

    return results;
  }

  async removeAuthorization(authorizationId: number) {
    const authorization = await this.authorizationRepository.findOne({
      where: { id: authorizationId },
      relations: ['usuarioAutorizador', 'usuarioAutorizado'],
    });

    if (!authorization) {
      throw new NotFoundException(`Autorización con ID ${authorizationId} no encontrada`);
    }

    // Desactivar en lugar de eliminar para mantener histórico
    await this.authorizationRepository.update(authorizationId, { esActivo: false });

    return {
      message: `Autorización removida: ${authorization.usuarioAutorizador.nombre} ya no puede ${authorization.tipoAutorizacion} a ${authorization.usuarioAutorizado.nombre}`,
    };
  }

  async getAuthorizationHierarchy() {
    // Obtener todas las autorizaciones activas agrupadas
    const authorizations = await this.authorizationRepository.find({
      where: { esActivo: true },
      relations: ['usuarioAutorizador', 'usuarioAutorizado', 'gestion'],
      order: { nivel: 'ASC', usuarioAutorizadorId: 'ASC' },
    });

    // Agrupar por autorizador
    const hierarchyMap = new Map<number, any>();

    for (const auth of authorizations) {
      if (!hierarchyMap.has(auth.usuarioAutorizadorId)) {
        hierarchyMap.set(auth.usuarioAutorizadorId, {
          autorizador: {
            userId: auth.usuarioAutorizador.userId,
            nombre: auth.usuarioAutorizador.nombre,
            cargo: auth.usuarioAutorizador.cargo,
            email: auth.usuarioAutorizador.email,
          },
          subordinados: [],
        });
      }

      hierarchyMap.get(auth.usuarioAutorizadorId).subordinados.push({
        authorizationId: auth.id,
        usuario: {
          userId: auth.usuarioAutorizado.userId,
          nombre: auth.usuarioAutorizado.nombre,
          cargo: auth.usuarioAutorizado.cargo,
        },
        tipoAutorizacion: auth.tipoAutorizacion,
        nivel: auth.nivel,
        gestion: auth.gestion?.nombre || 'Todas',
      });
    }

    return Array.from(hierarchyMap.values());
  }

  // ============================================
  // HELPERS
  // ============================================

  private sanitizeUser(user: User) {
    const { password, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  private getNivelFromTipo(tipo: string): number {
    switch (tipo) {
      case 'revision':
        return 1;
      case 'autorizacion':
        return 2;
      case 'aprobacion':
        return 2;
      default:
        return 1;
    }
  }

  // ============================================
  // USUARIOS DISPONIBLES PARA ASIGNAR
  // ============================================

  async getAvailableUsersForAuthorization(autorizadorId: number, tipo: string) {
    // Obtener usuarios que NO tienen ya esta autorización con este autorizador
    const existingAuths = await this.authorizationRepository.find({
      where: {
        usuarioAutorizadorId: autorizadorId,
        tipoAutorizacion: tipo,
        esActivo: true,
      },
    });

    const excludeIds = [
      autorizadorId,
      ...existingAuths.map(a => a.usuarioAutorizadoId),
    ];

    const availableUsers = await this.userRepository.find({
      where: {
        userId: Not(In(excludeIds)),
        estado: true,
      },
      relations: ['role'],
      order: { nombre: 'ASC' },
    });

    return availableUsers.map(user => ({
      userId: user.userId,
      nombre: user.nombre,
      cargo: user.cargo,
      email: user.email,
      rol: user.role?.nombreRol,
    }));
  }

  async getAllGestiones() {
    return this.gestionRepository.find({
      order: { gestionId: 'ASC' },
    });
  }
}
