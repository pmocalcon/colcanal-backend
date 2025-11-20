import { CreateSupplierDto } from './create-supplier.dto';
declare const UpdateSupplierDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateSupplierDto>>;
export declare class UpdateSupplierDto extends UpdateSupplierDto_base {
    isActive?: boolean;
}
export {};
