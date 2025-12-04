import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaterialDto {
  @ApiPropertyOptional({
    description: 'Código único del material (opcional, se genera automáticamente si no se proporciona)',
    example: '4000',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    description: 'Descripción del material',
    example: 'TORNILLO HEXAGONAL 1/2"',
  })
  @IsString()
  @IsNotEmpty({ message: 'La descripción del material es obligatoria' })
  description: string;

  @ApiProperty({
    description: 'ID del grupo al que pertenece el material',
    example: 7,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El grupo del material es obligatorio' })
  groupId: number;
}
