import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterRequisitionsDto {
  @ApiProperty({
    description: 'Número de página para la paginación (comienza en 1)',
    example: 1,
    type: Number,
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({
    description:
      'Cantidad máxima de requisiciones a retornar por página (máximo recomendado: 100)',
    example: 10,
    type: Number,
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiProperty({
    description:
      'Filtrar requisiciones por estado. Estados disponibles:\n' +
      '- **pendiente**: Requisición creada, esperando revisión\n' +
      '- **aprobada_revisor**: Aprobada por Director (Nivel 1)\n' +
      '- **rechazada_revisor**: Rechazada por Director\n' +
      '- **aprobada_gerencia**: Aprobada por Gerencia (Nivel 2)\n' +
      '- **rechazada_gerencia**: Rechazada por Gerencia\n' +
      '- **en_proceso**: En proceso de compra\n' +
      '- **completada**: Completada',
    example: 'pendiente',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El estado debe ser texto' })
  status?: string;

  @ApiProperty({
    description:
      'Fecha inicial del rango de búsqueda (formato ISO 8601: YYYY-MM-DD). Filtra requisiciones creadas desde esta fecha.',
    example: '2025-01-01',
    type: String,
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe estar en formato ISO 8601' })
  fromDate?: string;

  @ApiProperty({
    description:
      'Fecha final del rango de búsqueda (formato ISO 8601: YYYY-MM-DD). Filtra requisiciones creadas hasta esta fecha.',
    example: '2025-12-31',
    type: String,
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe estar en formato ISO 8601' })
  toDate?: string;

  @ApiProperty({
    description:
      'Filtrar requisiciones por proyecto específico. Útil para ver todas las requisiciones de un proyecto (ej: Ciudad Bolívar, Jericó, etc.)',
    example: 2,
    type: Number,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectId?: number;
}
