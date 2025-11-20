import {
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ItemPriceDto {
  @ApiProperty({
    description: 'ID del ítem de la requisición',
    example: 1,
  })
  @IsNumber()
  itemId: number;

  @ApiProperty({
    description: 'ID de la cotización (quotation) seleccionada para este ítem',
    example: 5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  quotationId?: number;

  @ApiProperty({
    description: 'Precio unitario sin IVA',
    example: 150000,
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({
    description: 'Indica si el ítem tiene IVA del 19%',
    example: true,
  })
  @IsBoolean()
  hasIva: boolean;

  @ApiProperty({
    description: 'Descuento aplicado al ítem',
    example: 5000,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;
}

export class AssignPricesDto {
  @ApiProperty({
    description: 'Array de ítems con sus precios asignados',
    type: [ItemPriceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPriceDto)
  items: ItemPriceDto[];
}
