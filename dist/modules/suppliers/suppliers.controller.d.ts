import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    create(createSupplierDto: CreateSupplierDto): Promise<import("../../database/entities").Supplier>;
    findAll(activeOnly?: string): Promise<import("../../database/entities").Supplier[]>;
    search(query: string): Promise<import("../../database/entities").Supplier[]>;
    findOne(id: number): Promise<import("../../database/entities").Supplier>;
    update(id: number, updateSupplierDto: UpdateSupplierDto): Promise<import("../../database/entities").Supplier>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
