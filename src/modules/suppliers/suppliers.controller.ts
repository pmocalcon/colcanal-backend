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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Suppliers - Proveedores')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // ============================================
  // ESTADÍSTICAS Y DATOS AUXILIARES
  // ============================================

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de proveedores' })
  @ApiResponse({ status: 200, description: 'Estadísticas de proveedores' })
  async getStats() {
    return await this.suppliersService.getStats();
  }

  @Get('cities')
  @ApiOperation({ summary: 'Obtener lista de ciudades de proveedores' })
  @ApiResponse({ status: 200, description: 'Lista de ciudades' })
  async getCities() {
    return await this.suppliersService.getCities();
  }

  // ============================================
  // CRUD PRINCIPAL
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo proveedor' })
  @ApiResponse({ status: 201, description: 'Proveedor creado exitosamente' })
  @ApiResponse({ status: 400, description: 'NIT/CC ya existe' })
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    return await this.suppliersService.create(createSupplierDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proveedores con paginación y filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página actual' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Búsqueda por nombre, NIT o ciudad' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filtrar por ciudad' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Campo para ordenar' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Dirección del orden' })
  @ApiResponse({ status: 200, description: 'Lista paginada de proveedores' })
  async findAll(@Query() query: QuerySupplierDto) {
    return await this.suppliersService.findAllPaginated(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar proveedores (para autocompletado)' })
  @ApiQuery({ name: 'q', required: true, description: 'Término de búsqueda' })
  @ApiResponse({ status: 200, description: 'Resultados de búsqueda' })
  async search(@Query('q') query: string) {
    return await this.suppliersService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un proveedor por ID' })
  @ApiResponse({ status: 200, description: 'Proveedor encontrado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.suppliersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un proveedor' })
  @ApiResponse({ status: 200, description: 'Proveedor actualizado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return await this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un proveedor (soft delete)' })
  @ApiResponse({ status: 200, description: 'Proveedor desactivado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.suppliersService.remove(id);
    return { message: 'Proveedor desactivado exitosamente' };
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reactivar un proveedor desactivado' })
  @ApiResponse({ status: 200, description: 'Proveedor reactivado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async reactivate(@Param('id', ParseIntPipe) id: number) {
    return await this.suppliersService.reactivate(id);
  }
}
