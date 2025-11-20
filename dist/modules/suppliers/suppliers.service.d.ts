import { Repository } from 'typeorm';
import { Supplier } from '../../database/entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
export declare class SuppliersService {
    private readonly supplierRepository;
    constructor(supplierRepository: Repository<Supplier>);
    create(createSupplierDto: CreateSupplierDto): Promise<Supplier>;
    findAll(activeOnly?: boolean): Promise<Supplier[]>;
    findOne(id: number): Promise<Supplier>;
    update(id: number, updateSupplierDto: UpdateSupplierDto): Promise<Supplier>;
    remove(id: number): Promise<void>;
    search(query: string): Promise<Supplier[]>;
}
