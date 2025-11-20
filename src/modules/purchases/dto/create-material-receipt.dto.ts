import {
  IsInt,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  IsPositive,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReceiptItemDto {
  @ApiProperty({
    description: 'ID del ítem de la orden de compra (po_item_id)',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  poItemId: number;

  @ApiProperty({
    description: 'Cantidad recibida',
    example: 5.5,
  })
  @IsNumber()
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  quantityReceived: number;

  @ApiProperty({
    description: 'Fecha de recepción (YYYY-MM-DD)',
    example: '2025-11-06',
  })
  @IsDateString()
  receivedDate: string;

  @ApiProperty({
    description: 'Observaciones de la recepción',
    required: false,
    example: 'Material en buen estado',
  })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({
    description:
      'Justificación si se recibió más de lo pendiente (sobreentrega)',
    required: false,
    example: 'El proveedor envió de más por error en despacho',
  })
  @IsOptional()
  @IsString()
  overdeliveryJustification?: string;
}

export class CreateMaterialReceiptDto {
  @ApiProperty({
    description: 'Lista de ítems a registrar como recibidos',
    type: [ReceiptItemDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe registrar al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items: ReceiptItemDto[];
}
