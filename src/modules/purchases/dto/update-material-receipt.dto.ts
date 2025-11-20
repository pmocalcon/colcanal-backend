import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMaterialReceiptDto {
  @ApiProperty({
    description: 'Nueva cantidad recibida',
    required: false,
    example: 8,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  quantityReceived?: number;

  @ApiProperty({
    description: 'Nueva fecha de recepción (YYYY-MM-DD)',
    required: false,
    example: '2025-11-07',
  })
  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @ApiProperty({
    description: 'Nuevas observaciones',
    required: false,
    example: 'Material revisado y almacenado',
  })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({
    description:
      'Nueva justificación de sobreentrega (solo si aplica)',
    required: false,
    example: 'Proveedor corrigió el envío',
  })
  @IsOptional()
  @IsString()
  overdeliveryJustification?: string;
}
