import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRequisitionItemDto {
  @ApiProperty({
    description:
      'ID del material a solicitar. Consulta los materiales disponibles en GET /purchases/master-data/materials',
    example: 1,
    type: Number,
    required: true,
  })
  @IsNumber({}, { message: 'El materialId debe ser un número válido' })
  @Type(() => Number)
  materialId: number;

  @ApiProperty({
    description: 'Cantidad de unidades del material a solicitar',
    example: 10,
    type: Number,
    minimum: 1,
    required: true,
  })
  @IsNumber({}, { message: 'La cantidad debe ser un número válido' })
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  @Type(() => Number)
  quantity: number;

  @ApiProperty({
    description:
      'Observaciones adicionales sobre el ítem (opcional). Ej: urgente, para proyecto X, etc.',
    example: 'Material urgente para reparación',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  observation?: string;
}
