import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../../database/entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';

export interface PaginatedSuppliers {
  data: Supplier[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
  citiesCount: number;
  topCities: { city: string; count: number }[];
}

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Verificar si ya existe un proveedor con el mismo NIT
    const existingSupplier = await this.supplierRepository.findOne({
      where: { nitCc: createSupplierDto.nitCc },
    });

    if (existingSupplier) {
      throw new BadRequestException(
        `Ya existe un proveedor con NIT/CC ${createSupplierDto.nitCc}`,
      );
    }

    const supplier = this.supplierRepository.create(createSupplierDto);
    return await this.supplierRepository.save(supplier);
  }

  async findAllPaginated(query: QuerySupplierDto): Promise<PaginatedSuppliers> {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      isActive,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = query;

    const queryBuilder = this.supplierRepository.createQueryBuilder('supplier');

    // Filtro por estado
    if (isActive !== undefined) {
      queryBuilder.andWhere('supplier.isActive = :isActive', { isActive });
    }

    // Filtro por ciudad
    if (city) {
      queryBuilder.andWhere('supplier.city ILIKE :city', { city: `%${city}%` });
    }

    // Búsqueda general
    if (search) {
      queryBuilder.andWhere(
        '(supplier.name ILIKE :search OR supplier.nitCc ILIKE :search OR supplier.city ILIKE :search OR supplier.email ILIKE :search OR supplier.contactPerson ILIKE :search OR supplier.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Ordenamiento
    const validSortFields = ['name', 'city', 'nitCc', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    queryBuilder.orderBy(`supplier.${sortField}`, sortOrder);

    // Contar total
    const total = await queryBuilder.getCount();

    // Paginación
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findAll(activeOnly: boolean = true): Promise<Supplier[]> {
    const where = activeOnly ? { isActive: true } : {};
    return await this.supplierRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { supplierId: id },
    });

    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }

    return supplier;
  }

  async findByNit(nitCc: string): Promise<Supplier | null> {
    return await this.supplierRepository.findOne({
      where: { nitCc },
    });
  }

  async update(
    id: number,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id);

    // Si se está actualizando el NIT, verificar que no esté duplicado
    if (
      updateSupplierDto.nitCc &&
      updateSupplierDto.nitCc !== supplier.nitCc
    ) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: { nitCc: updateSupplierDto.nitCc },
      });

      if (existingSupplier && existingSupplier.supplierId !== id) {
        throw new BadRequestException(
          `Ya existe un proveedor con NIT/CC ${updateSupplierDto.nitCc}`,
        );
      }
    }

    Object.assign(supplier, updateSupplierDto);
    return await this.supplierRepository.save(supplier);
  }

  async remove(id: number): Promise<void> {
    const supplier = await this.findOne(id);
    supplier.isActive = false;
    await this.supplierRepository.save(supplier);
  }

  async reactivate(id: number): Promise<Supplier> {
    const supplier = await this.findOne(id);

    if (supplier.isActive) {
      throw new BadRequestException('El proveedor ya está activo');
    }

    supplier.isActive = true;
    return await this.supplierRepository.save(supplier);
  }

  async hardDelete(id: number): Promise<void> {
    const supplier = await this.findOne(id);

    // Verificar si tiene cotizaciones u órdenes de compra asociadas
    const supplierWithRelations = await this.supplierRepository.findOne({
      where: { supplierId: id },
      relations: ['quotations', 'purchaseOrders'],
    });

    if (
      supplierWithRelations?.quotations?.length ||
      supplierWithRelations?.purchaseOrders?.length
    ) {
      throw new BadRequestException(
        'No se puede eliminar el proveedor porque tiene cotizaciones u órdenes de compra asociadas. Desactívelo en su lugar.',
      );
    }

    await this.supplierRepository.remove(supplier);
  }

  async search(query: string): Promise<Supplier[]> {
    return await this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.isActive = true')
      .andWhere(
        '(supplier.name ILIKE :query OR supplier.nitCc ILIKE :query OR supplier.city ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('supplier.name', 'ASC')
      .getMany();
  }

  async getStats(): Promise<SupplierStats> {
    const total = await this.supplierRepository.count();
    const active = await this.supplierRepository.count({
      where: { isActive: true },
    });
    const inactive = total - active;

    // Obtener ciudades únicas
    const citiesResult = await this.supplierRepository
      .createQueryBuilder('supplier')
      .select('COUNT(DISTINCT supplier.city)', 'count')
      .getRawOne();

    // Top 5 ciudades con más proveedores
    const topCities = await this.supplierRepository
      .createQueryBuilder('supplier')
      .select('supplier.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('supplier.isActive = true')
      .groupBy('supplier.city')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      total,
      active,
      inactive,
      citiesCount: parseInt(citiesResult?.count || '0', 10),
      topCities: topCities.map((c) => ({
        city: c.city,
        count: parseInt(c.count, 10),
      })),
    };
  }

  async getCities(): Promise<string[]> {
    const result = await this.supplierRepository
      .createQueryBuilder('supplier')
      .select('DISTINCT supplier.city', 'city')
      .where('supplier.isActive = true')
      .orderBy('supplier.city', 'ASC')
      .getRawMany();

    return result.map((r) => r.city);
  }
}
