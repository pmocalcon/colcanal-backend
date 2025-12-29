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

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  // ============================================
  // PAGINACIÓN Y FILTROS
  // ============================================

  async findAllPaginated(query: QuerySupplierDto) {
    const { page = 1, limit = 10, search, city, isActive, sortBy = 'name', sortOrder = 'ASC' } = query;
    const skip = (page - 1) * limit;

    const qb = this.supplierRepository.createQueryBuilder('supplier');

    // Filtro por estado activo
    if (isActive !== undefined) {
      qb.andWhere('supplier.isActive = :isActive', { isActive });
    }

    // Filtro por ciudad
    if (city) {
      qb.andWhere('supplier.city ILIKE :city', { city: `%${city}%` });
    }

    // Búsqueda general
    if (search) {
      qb.andWhere(
        '(supplier.name ILIKE :search OR supplier.nitCc ILIKE :search OR supplier.city ILIKE :search OR supplier.contactName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Ordenamiento
    const validSortFields = ['name', 'city', 'nitCc', 'createdAt', 'supplierId'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    qb.orderBy(`supplier.${sortField}`, sortOrder);

    // Obtener total y datos paginados
    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  async getStats() {
    const total = await this.supplierRepository.count();
    const active = await this.supplierRepository.count({ where: { isActive: true } });
    const inactive = await this.supplierRepository.count({ where: { isActive: false } });

    // Contar por ciudad
    const citiesResult = await this.supplierRepository
      .createQueryBuilder('supplier')
      .select('supplier.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('supplier.isActive = true')
      .groupBy('supplier.city')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total,
      active,
      inactive,
      topCities: citiesResult,
    };
  }

  // ============================================
  // CIUDADES
  // ============================================

  async getCities() {
    const result = await this.supplierRepository
      .createQueryBuilder('supplier')
      .select('DISTINCT supplier.city', 'city')
      .where('supplier.city IS NOT NULL')
      .andWhere("supplier.city != ''")
      .orderBy('supplier.city', 'ASC')
      .getRawMany();

    return result.map((r) => r.city);
  }

  // ============================================
  // REACTIVAR PROVEEDOR
  // ============================================

  async reactivate(id: number): Promise<Supplier> {
    const supplier = await this.findOne(id);
    supplier.isActive = true;
    return await this.supplierRepository.save(supplier);
  }

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
}
