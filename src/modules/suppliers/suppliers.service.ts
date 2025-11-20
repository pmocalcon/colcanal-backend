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
