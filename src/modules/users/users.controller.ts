import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, CreateAuthorizationDto, BulkAuthorizationDto } from './dto';

// Roles permitidos para acceder al módulo de administración de usuarios
const ALLOWED_ROLES = [
  'Director Tics',
  'Analista Tics',
  'Director PMO',
  'Analista PMO',
  'Gerencia', // Gerencia siempre tiene acceso
];

@ApiTags('Users - Administración de Usuarios')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============================================
  // MIDDLEWARE DE VALIDACIÓN DE ACCESO
  // ============================================

  private checkAccess(request: any) {
    const userRole = request.user?.role?.nombreRol || request.user?.nombreRol;

    if (!userRole) {
      throw new ForbiddenException('No se pudo determinar el rol del usuario');
    }

    const hasAccess = ALLOWED_ROLES.some(
      role => userRole.toLowerCase().includes(role.toLowerCase()) ||
              role.toLowerCase().includes(userRole.toLowerCase())
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `Acceso denegado. Solo los roles ${ALLOWED_ROLES.join(', ')} pueden acceder a este módulo.`
      );
    }
  }

  // ============================================
  // CRUD DE USUARIOS
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Incluir usuarios inactivos' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll(
    @Request() req,
    @Query('includeInactive') includeInactive?: string,
  ) {
    this.checkAccess(req);
    return this.usersService.findAll(includeInactive === 'true');
  }

  @Get('roles')
  @ApiOperation({ summary: 'Listar todos los roles disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de roles con sus permisos' })
  async findAllRoles(@Request() req) {
    this.checkAccess(req);
    return this.usersService.findAllRoles();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Listar todos los permisos del sistema' })
  @ApiResponse({ status: 200, description: 'Lista de permisos' })
  async findAllPermissions(@Request() req) {
    this.checkAccess(req);
    return this.usersService.findAllPermissions();
  }

  @Get('gestiones')
  @ApiOperation({ summary: 'Listar todas las gestiones/módulos del sistema' })
  @ApiResponse({ status: 200, description: 'Lista de gestiones' })
  async findAllGestiones(@Request() req) {
    this.checkAccess(req);
    return this.usersService.getAllGestiones();
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Obtener jerarquía completa de autorizaciones' })
  @ApiResponse({ status: 200, description: 'Jerarquía de autorizaciones' })
  async getHierarchy(@Request() req) {
    this.checkAccess(req);
    return this.usersService.getAuthorizationHierarchy();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkAccess(req);
    return this.usersService.findOne(id);
  }

  @Get(':id/authorizations')
  @ApiOperation({ summary: 'Obtener autorizaciones de un usuario (subordinados y supervisores)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Autorizaciones del usuario' })
  async getUserAuthorizations(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkAccess(req);
    return this.usersService.getUserAuthorizations(id);
  }

  @Get(':id/available-subordinates')
  @ApiOperation({ summary: 'Obtener usuarios disponibles para asignar como subordinados' })
  @ApiParam({ name: 'id', description: 'ID del usuario autorizador' })
  @ApiQuery({ name: 'tipo', required: true, enum: ['revision', 'autorizacion', 'aprobacion'] })
  @ApiResponse({ status: 200, description: 'Lista de usuarios disponibles' })
  async getAvailableSubordinates(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Query('tipo') tipo: string,
  ) {
    this.checkAccess(req);
    return this.usersService.getAvailableUsersForAuthorization(id, tipo);
  }

  @Get('roles/:rolId/permissions')
  @ApiOperation({ summary: 'Obtener permisos de un rol específico' })
  @ApiParam({ name: 'rolId', description: 'ID del rol' })
  @ApiResponse({ status: 200, description: 'Permisos del rol' })
  async getRolePermissions(
    @Request() req,
    @Param('rolId', ParseIntPipe) rolId: number,
  ) {
    this.checkAccess(req);
    return this.usersService.getRolePermissions(rolId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Email ya existe' })
  async create(
    @Request() req,
    @Body() createUserDto: CreateUserDto,
  ) {
    this.checkAccess(req);
    return this.usersService.create(createUserDto);
  }

  @Post(':id/authorizations')
  @ApiOperation({ summary: 'Crear una nueva autorización (asignar subordinado)' })
  @ApiParam({ name: 'id', description: 'ID del usuario autorizador (supervisor)' })
  @ApiResponse({ status: 201, description: 'Autorización creada' })
  @ApiResponse({ status: 409, description: 'Autorización ya existe' })
  async createAuthorization(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() createAuthorizationDto: CreateAuthorizationDto,
  ) {
    this.checkAccess(req);
    return this.usersService.createAuthorization(id, createAuthorizationDto);
  }

  @Post('authorizations/bulk')
  @ApiOperation({ summary: 'Crear múltiples autorizaciones a la vez' })
  @ApiResponse({ status: 201, description: 'Autorizaciones creadas' })
  async createBulkAuthorizations(
    @Request() req,
    @Body() bulkDto: BulkAuthorizationDto,
  ) {
    this.checkAccess(req);
    return this.usersService.createBulkAuthorizations(bulkDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.checkAccess(req);
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario activado' })
  async activate(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkAccess(req);
    return this.usersService.activate(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  async deactivate(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkAccess(req);
    return this.usersService.deactivate(id);
  }

  @Delete('authorizations/:authId')
  @ApiOperation({ summary: 'Eliminar una autorización' })
  @ApiParam({ name: 'authId', description: 'ID de la autorización' })
  @ApiResponse({ status: 200, description: 'Autorización eliminada' })
  async removeAuthorization(
    @Request() req,
    @Param('authId', ParseIntPipe) authId: number,
  ) {
    this.checkAccess(req);
    return this.usersService.removeAuthorization(authId);
  }
}
