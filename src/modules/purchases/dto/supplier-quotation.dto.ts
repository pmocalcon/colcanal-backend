import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class SupplierQuotationDto {
  @IsNumber()
  supplierId: number;

  @IsNumber()
  @Min(1)
  supplierOrder: number; // 1 o 2

  @IsString()
  @IsOptional()
  observations?: string;
}
