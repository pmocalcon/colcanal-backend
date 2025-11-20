"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const supplier_entity_1 = require("../../database/entities/supplier.entity");
let SuppliersService = class SuppliersService {
    supplierRepository;
    constructor(supplierRepository) {
        this.supplierRepository = supplierRepository;
    }
    async create(createSupplierDto) {
        const existingSupplier = await this.supplierRepository.findOne({
            where: { nitCc: createSupplierDto.nitCc },
        });
        if (existingSupplier) {
            throw new common_1.BadRequestException(`Ya existe un proveedor con NIT/CC ${createSupplierDto.nitCc}`);
        }
        const supplier = this.supplierRepository.create(createSupplierDto);
        return await this.supplierRepository.save(supplier);
    }
    async findAll(activeOnly = true) {
        const where = activeOnly ? { isActive: true } : {};
        return await this.supplierRepository.find({
            where,
            order: { name: 'ASC' },
        });
    }
    async findOne(id) {
        const supplier = await this.supplierRepository.findOne({
            where: { supplierId: id },
        });
        if (!supplier) {
            throw new common_1.NotFoundException(`Proveedor con ID ${id} no encontrado`);
        }
        return supplier;
    }
    async update(id, updateSupplierDto) {
        const supplier = await this.findOne(id);
        if (updateSupplierDto.nitCc &&
            updateSupplierDto.nitCc !== supplier.nitCc) {
            const existingSupplier = await this.supplierRepository.findOne({
                where: { nitCc: updateSupplierDto.nitCc },
            });
            if (existingSupplier && existingSupplier.supplierId !== id) {
                throw new common_1.BadRequestException(`Ya existe un proveedor con NIT/CC ${updateSupplierDto.nitCc}`);
            }
        }
        Object.assign(supplier, updateSupplierDto);
        return await this.supplierRepository.save(supplier);
    }
    async remove(id) {
        const supplier = await this.findOne(id);
        supplier.isActive = false;
        await this.supplierRepository.save(supplier);
    }
    async search(query) {
        return await this.supplierRepository
            .createQueryBuilder('supplier')
            .where('supplier.isActive = true')
            .andWhere('(supplier.name ILIKE :query OR supplier.nitCc ILIKE :query OR supplier.city ILIKE :query)', { query: `%${query}%` })
            .orderBy('supplier.name', 'ASC')
            .getMany();
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(supplier_entity_1.Supplier)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map