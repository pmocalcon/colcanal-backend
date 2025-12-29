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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Proveedores')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // ==================== CRUD BÁSICO ====================

  @Post()
  @Roles('TICs', 'PMO', 'Gerencia', 'Compras', 'Director Compras')
  @ApiOperation({
    summary: 'Crear nuevo proveedor',
    description: 'Crea un nuevo proveedor en el sistema. El NIT/CC debe ser único.',
  })
  @ApiResponse({
    status: 201,
    description: 'Proveedor creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o NIT/CC duplicado',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    return await this.suppliersService.create(createSupplierDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar proveedores con paginación',
    description: 'Obtiene lista de proveedores con filtros, búsqueda y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de proveedores con metadata de paginación',
  })
  async findAllPaginated(@Query() query: QuerySupplierDto) {
    return await this.suppliersService.findAllPaginated(query);
  }

  @Get('all')
  @ApiOperation({
    summary: 'Listar todos los proveedores (sin paginación)',
    description: 'Obtiene todos los proveedores activos sin paginación. Útil para selectores.',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Si es true, solo devuelve proveedores activos (default: true)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de proveedores',
  })
  async findAll(@Query('activeOnly') activeOnly?: string) {
    const active = activeOnly === undefined || activeOnly === 'true';
    return await this.suppliersService.findAll(active);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Buscar proveedores',
    description: 'Búsqueda rápida de proveedores por nombre, NIT o ciudad',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Texto de búsqueda',
  })
  @ApiResponse({
    status: 200,
    description: 'Proveedores que coinciden con la búsqueda',
  })
  async search(@Query('q') query: string) {
    return await this.suppliersService.search(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Estadísticas de proveedores',
    description: 'Obtiene estadísticas generales: totales, activos, inactivos y distribución por ciudad',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de proveedores',
  })
  async getStats() {
    return await this.suppliersService.getStats();
  }

  @Get('cities')
  @ApiOperation({
    summary: 'Listar ciudades',
    description: 'Obtiene lista de ciudades únicas de proveedores activos. Útil para filtros.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ciudades',
  })
  async getCities() {
    return await this.suppliersService.getCities();
  }

  @Get('by-nit/:nit')
  @ApiOperation({
    summary: 'Buscar proveedor por NIT/CC',
    description: 'Busca un proveedor específico por su NIT o cédula',
  })
  @ApiParam({
    name: 'nit',
    description: 'NIT o cédula del proveedor',
    example: '900123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Proveedor encontrado o null',
  })
  async findByNit(@Param('nit') nit: string) {
    return await this.suppliersService.findByNit(nit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener proveedor por ID',
    description: 'Obtiene los detalles completos de un proveedor específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del proveedor',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles del proveedor',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.suppliersService.findOne(id);
  }

  @Put(':id')
  @Roles('TICs', 'PMO', 'Gerencia', 'Compras', 'Director Compras')
  @ApiOperation({
    summary: 'Actualizar proveedor',
    description: 'Actualiza la información de un proveedor existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del proveedor',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Proveedor actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o NIT/CC duplicado',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return await this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @Roles('TICs', 'PMO', 'Gerencia', 'Director Compras')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar proveedor (soft delete)',
    description: 'Desactiva un proveedor sin eliminarlo de la base de datos',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del proveedor',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Proveedor desactivado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.suppliersService.remove(id);
    return { message: 'Proveedor desactivado exitosamente' };
  }

  @Patch(':id/reactivate')
  @Roles('TICs', 'PMO', 'Gerencia', 'Director Compras')
  @ApiOperation({
    summary: 'Reactivar proveedor',
    description: 'Reactiva un proveedor previamente desactivado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del proveedor',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Proveedor reactivado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'El proveedor ya está activo',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado',
  })
  async reactivate(@Param('id', ParseIntPipe) id: number) {
    return await this.suppliersService.reactivate(id);
  }

  @Delete(':id/permanent')
  @Roles('TICs', 'Gerencia')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar proveedor permanentemente',
    description:
      'Elimina un proveedor de forma permanente. Solo funciona si no tiene cotizaciones u órdenes de compra asociadas.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del proveedor',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Proveedor eliminado permanentemente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar porque tiene registros asociados',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado',
  })
  async hardDelete(@Param('id', ParseIntPipe) id: number) {
    await this.suppliersService.hardDelete(id);
  }
}
