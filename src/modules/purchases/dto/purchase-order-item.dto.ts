import {
  IsNumber,
  IsBoolean,
  IsOptional,
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
}
