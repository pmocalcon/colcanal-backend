import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
  Request,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";

import { UsersService } from "./users.service";
import {
  CreateUserDto,
  UpdateUserDto,
  CreateAuthorizationDto,
  BulkAuthorizationDto,
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionsDto,
  AssignGestionesDto,
} from "./dto";
import { USER_ADMIN_ALLOWED_ROLES } from "../../common/constants";

@ApiTags("Users - Administración de Usuarios")
@ApiBearerAuth()
@Controller("users")
@UseGuards(AuthGuard("jwt"))
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  // ============================================
  // MIDDLEWARE DE VALIDACIÓN DE ACCESO
  // ============================================

  private checkAccess(request: any) {
    const userRole = request.user?.role?.nombreRol || request.user?.nombreRol;

    if (!userRole) {
      throw new ForbiddenException("No se pudo determinar el rol del usuario");
    }

    // Normalizar el rol del usuario: minúsculas y sin espacios extras
    const normalizedUserRole = userRole
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

    // Verificar si el rol del usuario está en la lista de permitidos
    const hasAccess = USER_ADMIN_ALLOWED_ROLES.some((allowedRole) => {
      // Comparación exacta normalizada
      if (normalizedUserRole === allowedRole) return true;
      // O si uno contiene al otro (para casos como "Analista de PMO")
      if (
        normalizedUserRole.includes(allowedRole) ||
        allowedRole.includes(normalizedUserRole)
      )
        return true;
      return false;
    });

    if (!hasAccess) {
      this.logger.warn(
        `Acceso denegado para rol: "${userRole}" (normalizado: "${normalizedUserRole}")`,
      );
      throw new ForbiddenException(
        `Acceso denegado. Tu rol "${userRole}" no tiene permisos para este módulo.`,
      );
    }
  }

  // ============================================
  // CRUD DE USUARIOS
  // ============================================

  @Get()
  @ApiOperation({ summary: "Listar todos los usuarios" })
  @ApiQuery({
    name: "includeInactive",
    required: false,
    type: Boolean,
    description: "Incluir usuarios inactivos",
  })
  @ApiResponse({ status: 200, description: "Lista de usuarios" })
  async findAll(
    @Request() req,
    @Query("includeInactive") includeInactive?: string,
  ) {
    this.checkAccess(req);
    return this.usersService.findAll(includeInactive === "true");
  }

  // Endpoints "public": requieren sesión (JWT) pero NO rol de administrador.
  // Sirven para poblar selects (p. ej. "Revisor designado") desde cualquier rol.
  @Get("public/active")
  @ApiOperation({ summary: "Listar usuarios activos (cualquier usuario autenticado)" })
  @ApiResponse({ status: 200, description: "Lista de usuarios activos" })
  async findPublicActive() {
    return this.usersService.findAllActive();
  }

  @Get("public/by-roles")
  @ApiOperation({ summary: "Listar usuarios activos por nombres de rol (cualquier usuario autenticado)" })
  @ApiQuery({ name: "roles", required: true, description: "Nombres de rol separados por coma" })
  @ApiResponse({ status: 200, description: "Lista de usuarios activos con esos roles" })
  async findPublicByRoles(@Query("roles") roles?: string) {
    const names = (roles || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    return this.usersService.findActiveByRoleNames(names);
  }

  @Get("roles")
  @ApiOperation({ summary: "Listar todos los roles disponibles" })
  @ApiResponse({ status: 200, description: "Lista de roles con sus permisos" })
  async findAllRoles(@Request() req) {
    this.checkAccess(req);
    return this.usersService.findAllRoles();
  }

  @Get("permissions")
  @ApiOperation({ summary: "Listar todos los permisos del sistema" })
  @ApiResponse({ status: 200, description: "Lista de permisos" })
  async findAllPermissions(@Request() req) {
    this.checkAccess(req);
    return this.usersService.findAllPermissions();
  }

  @Get("gestiones")
  @ApiOperation({ summary: "Listar todas las gestiones/módulos del sistema" })
  @ApiResponse({ status: 200, description: "Lista de gestiones" })
  async findAllGestiones(@Request() req) {
    this.checkAccess(req);
    return this.usersService.getAllGestiones();
  }

  // ============================================
  // PANEL DE CREDENCIALES
  // ============================================

  @Get("credenciales/estado")
  @ApiOperation({
    summary: "Estado de credenciales de todos los usuarios",
    description:
      "Devuelve, por usuario, si su clave es temporal, personal o exenta, " +
      "si está bloqueado y su último acceso. No devuelve contraseñas.",
  })
  @ApiResponse({ status: 200, description: "Estado de credenciales" })
  async credencialesEstado(@Request() req) {
    this.checkAccess(req);
    return this.usersService.credencialesEstado();
  }

  @Post("credenciales/restablecer-lote")
  @ApiOperation({
    summary: "Restablecer contraseñas en lote",
    description:
      "Genera una clave temporal por usuario y la devuelve una vez. " +
      "Omite las cuentas exentas.",
  })
  @ApiResponse({ status: 201, description: "Temporales generadas" })
  async restablecerLote(@Request() req, @Body("userIds") userIds: number[]) {
    this.checkAccess(req);
    return this.usersService.restablecerPasswordLote(userIds ?? []);
  }

  @Post(":id/restablecer-password")
  @ApiOperation({
    summary: "Restablecer la contraseña de un usuario",
    description:
      "Genera una clave temporal fuerte, la asigna y la devuelve una sola " +
      "vez. El usuario quedará obligado a cambiarla al ingresar.",
  })
  @ApiParam({ name: "id", description: "ID del usuario" })
  @ApiResponse({ status: 201, description: "Clave temporal generada" })
  async restablecerPassword(
    @Request() req,
    @Param("id", ParseIntPipe) id: number,
  ) {
    this.checkAccess(req);
    return this.usersService.restablecerPassword(id);
  }

  // ============================================
  // CRUD DE ROLES
  // ============================================

  @Post("roles")
  @ApiOperation({ summary: "Crear un nuevo rol" })
  @ApiResponse({ status: 201, description: "Rol creado exitosamente" })
  @ApiResponse({ status: 409, description: "Ya existe un rol con ese nombre" })
  async createRole(@Request() req, @Body() createRoleDto: CreateRoleDto) {
    this.checkAccess(req);
    return this.usersService.createRole(createRoleDto);
  }

  @Get("roles/:rolId")
  @ApiOperation({
    summary: "Obtener un rol por ID con sus permisos y gestiones",
  })
  @ApiParam({ name: "rolId", description: "ID del rol" })
  @ApiResponse({ status: 200, description: "Rol encontrado" })
  @ApiResponse({ status: 404, description: "Rol no encontrado" })
  async findOneRole(
    @Request() req,
    @Param("rolId", ParseIntPipe) rolId: number,
  ) {
    this.checkAccess(req);
    return this.usersService.findOneRole(rolId);
  }

  @Patch("roles/:rolId")
  @ApiOperation({ summary: "Actualizar un rol" })
  @ApiParam({ name: "rolId", description: "ID del rol" })
  @ApiResponse({ status: 200, description: "Rol actualizado" })
  @ApiResponse({ status: 404, description: "Rol no encontrado" })
  async updateRole(
    @Request() req,
    @Param("rolId", ParseIntPipe) rolId: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    this.checkAccess(req);
    return this.usersService.updateRole(rolId, updateRoleDto);
  }

  @Delete("roles/:rolId")
  @ApiOperation({
    summary: "Eliminar un rol (solo si no tiene usuarios asignados)",
  })
  @ApiParam({ name: "rolId", description: "ID del rol" })
  @ApiResponse({ status: 200, description: "Rol eliminado" })
  @ApiResponse({ status: 400, description: "El rol tiene usuarios asignados" })
  @ApiResponse({ status: 404, description: "Rol no encontrado" })
  async deleteRole(
    @Request() req,
    @Param("rolId", ParseIntPipe) rolId: number,
  ) {
    this.checkAccess(req);
    return this.usersService.deleteRole(rolId);
  }

  @Put("roles/:rolId/permissions")
  @ApiOperation({
    summary: "Asignar permisos a un rol (reemplaza los existentes)",
  })
  @ApiParam({ name: "rolId", description: "ID del rol" })
  @ApiResponse({ status: 200, description: "Permisos asignados" })
  @ApiResponse({ status: 404, description: "Rol o permisos no encontrados" })
  async assignPermissions(
    @Request() req,
    @Param("rolId", ParseIntPipe) rolId: number,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ) {
    this.checkAccess(req);
    return this.usersService.assignPermissionsToRole(
      rolId,
      assignPermissionsDto,
    );
  }

  @Put("roles/:rolId/gestiones")
  @ApiOperation({
    summary: "Asignar gestiones/módulos a un rol (reemplaza los existentes)",
  })
  @ApiParam({ name: "rolId", description: "ID del rol" })
  @ApiResponse({ status: 200, description: "Gestiones asignadas" })
  @ApiResponse({ status: 404, description: "Rol o gestiones no encontradas" })
  async assignGestiones(
    @Request() req,
    @Param("rolId", ParseIntPipe) rolId: number,
    @Body() assignGestionesDto: AssignGestionesDto,
  ) {
    this.checkAccess(req);
    return this.usersService.assignGestionesToRole(rolId, assignGestionesDto);
  }

  @Get("roles/:rolId/gestiones")
  @ApiOperation({ summary: "Obtener gestiones/módulos de un rol específico" })
  @ApiParam({ name: "rolId", description: "ID del rol" })
  @ApiResponse({ status: 200, description: "Gestiones del rol" })
  async getRoleGestiones(
    @Request() req,
    @Param("rolId", ParseIntPipe) rolId: number,
  ) {
    this.checkAccess(req);
    return this.usersService.getRoleGestiones(rolId);
  }

  @Get("hierarchy")
  @ApiOperation({ summary: "Obtener jerarquía completa de autorizaciones" })
  @ApiResponse({ status: 200, description: "Jerarquía de autorizaciones" })
  async getHierarchy(@Request() req) {
    this.checkAccess(req);
    return this.usersService.getAuthorizationHierarchy();
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener un usuario por ID" })
  @ApiParam({ name: "id", description: "ID del usuario" })
  @ApiResponse({ status: 200, description: "Usuario encontrado" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  async findOne(@Request() req, @Param("id", ParseIntPipe) id: number) {
    this.checkAccess(req);
    return this.usersService.findOne(id);
  }

  @Get(":id/authorizations")
  @ApiOperation({
    summary:
      "Obtener autorizaciones de un usuario (subordinados y supervisores)",
  })
  @ApiParam({ name: "id", description: "ID del usuario" })
  @ApiResponse({ status: 200, description: "Autorizaciones del usuario" })
  async getUserAuthorizations(
    @Request() req,
    @Param("id", ParseIntPipe) id: number,
  ) {
    this.checkAccess(req);
    return this.usersService.getUserAuthorizations(id);
  }

  @Get(":id/available-subordinates")
  @ApiOperation({
    summary: "Obtener usuarios disponibles para asignar como subordinados",
  })
  @ApiParam({ name: "id", description: "ID del usuario autorizador" })
  @ApiQuery({
    name: "tipo",
    required: true,
    enum: ["revision", "autorizacion", "aprobacion"],
  })
  @ApiResponse({ status: 200, description: "Lista de usuarios disponibles" })
  async getAvailableSubordinates(
    @Request() req,
    @Param("id", ParseIntPipe) id: number,
    @Query("tipo") tipo: string,
  ) {
    this.checkAccess(req);
    return this.usersService.getAvailableUsersForAuthorization(id, tipo);
  }

  @Get("roles/:rolId/permissions")
  @ApiOperation({ summary: "Obtener permisos de un rol específico" })
  @ApiParam({ name: "rolId", description: "ID del rol" })
  @ApiResponse({ status: 200, description: "Permisos del rol" })
  async getRolePermissions(
    @Request() req,
    @Param("rolId", ParseIntPipe) rolId: number,
  ) {
    this.checkAccess(req);
    return this.usersService.getRolePermissions(rolId);
  }

  @Get("roles/:rolId/module-permissions")
  @ApiOperation({
    summary: "Permisos por módulo de un rol (matriz módulo × permiso)",
  })
  @ApiParam({ name: "rolId", description: "ID del rol" })
  @ApiResponse({ status: 200, description: "Permisos por módulo del rol" })
  async getModulePermissions(
    @Request() req,
    @Param("rolId", ParseIntPipe) rolId: number,
  ) {
    this.checkAccess(req);
    return this.usersService.getModulePermissions(rolId);
  }

  @Put("roles/:rolId/module-permissions")
  @ApiOperation({
    summary: "Asignar permisos por módulo a un rol (reemplazo completo)",
  })
  @ApiParam({ name: "rolId", description: "ID del rol" })
  @ApiResponse({ status: 200, description: "Permisos por módulo actualizados" })
  async setModulePermissions(
    @Request() req,
    @Param("rolId", ParseIntPipe) rolId: number,
    @Body("asignaciones")
    asignaciones: Array<{ gestionId: number; permisoIds: number[] }>,
  ) {
    this.checkAccess(req);
    return this.usersService.setModulePermissions(rolId, asignaciones ?? []);
  }

  @Post()
  @ApiOperation({ summary: "Crear un nuevo usuario" })
  @ApiResponse({ status: 201, description: "Usuario creado exitosamente" })
  @ApiResponse({ status: 400, description: "Datos inválidos" })
  @ApiResponse({ status: 409, description: "Email ya existe" })
  async create(@Request() req, @Body() createUserDto: CreateUserDto) {
    this.checkAccess(req);
    return this.usersService.create(createUserDto);
  }

  @Post(":id/authorizations")
  @ApiOperation({
    summary: "Crear una nueva autorización (asignar subordinado)",
  })
  @ApiParam({
    name: "id",
    description: "ID del usuario autorizador (supervisor)",
  })
  @ApiResponse({ status: 201, description: "Autorización creada" })
  @ApiResponse({ status: 409, description: "Autorización ya existe" })
  async createAuthorization(
    @Request() req,
    @Param("id", ParseIntPipe) id: number,
    @Body() createAuthorizationDto: CreateAuthorizationDto,
  ) {
    this.checkAccess(req);
    return this.usersService.createAuthorization(id, createAuthorizationDto);
  }

  @Post("authorizations/bulk")
  @ApiOperation({ summary: "Crear múltiples autorizaciones a la vez" })
  @ApiResponse({ status: 201, description: "Autorizaciones creadas" })
  async createBulkAuthorizations(
    @Request() req,
    @Body() bulkDto: BulkAuthorizationDto,
  ) {
    this.checkAccess(req);
    return this.usersService.createBulkAuthorizations(bulkDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar un usuario" })
  @ApiParam({ name: "id", description: "ID del usuario" })
  @ApiResponse({ status: 200, description: "Usuario actualizado" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  async update(
    @Request() req,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.checkAccess(req);
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(":id/activate")
  @ApiOperation({ summary: "Activar un usuario" })
  @ApiParam({ name: "id", description: "ID del usuario" })
  @ApiResponse({ status: 200, description: "Usuario activado" })
  async activate(@Request() req, @Param("id", ParseIntPipe) id: number) {
    this.checkAccess(req);
    return this.usersService.activate(id);
  }

  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Desactivar un usuario" })
  @ApiParam({ name: "id", description: "ID del usuario" })
  @ApiResponse({ status: 200, description: "Usuario desactivado" })
  async deactivate(@Request() req, @Param("id", ParseIntPipe) id: number) {
    this.checkAccess(req);
    return this.usersService.deactivate(id);
  }

  @Delete("authorizations/:authId")
  @ApiOperation({ summary: "Eliminar una autorización" })
  @ApiParam({ name: "authId", description: "ID de la autorización" })
  @ApiResponse({ status: 200, description: "Autorización eliminada" })
  async removeAuthorization(
    @Request() req,
    @Param("authId", ParseIntPipe) authId: number,
  ) {
    this.checkAccess(req);
    return this.usersService.removeAuthorization(authId);
  }
}
