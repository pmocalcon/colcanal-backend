import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMaterialDto {
  @ApiPropertyOptional({
    description: 'Código único del material',
    example: '4000',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'Descripción del material',
    example: 'TORNILLO HEXAGONAL 1/2"',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'ID del grupo al que pertenece el material',
    example: 7,
  })
  @IsNumber()
  @IsOptional()
  groupId?: number;
}
