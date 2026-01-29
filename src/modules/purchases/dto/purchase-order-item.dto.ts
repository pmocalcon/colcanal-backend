import {
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsString,
  Min,
} from 'class-validator';

export class PurchaseOrderItemDto {
  @IsNumber()
  itemId: number;

  @IsNumber()
  supplierId: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsBoolean()
  @IsOptional()
  hasIVA?: boolean = true;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number = 0;

  @IsDateString()
  @IsOptional()
  estimatedDeliveryDate?: string; // Fecha estimada de entrega (por proveedor)

  @IsNumber()
  @Min(0)
  @IsOptional()
  otherValue?: number = 0; // Valor adicional (aparte del IVA) - por proveedor

  @IsString()
  @IsOptional()
  observations?: string; // Observaciones - por proveedor
}
