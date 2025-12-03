import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaterialGroupDto {
  @ApiProperty({
    description: 'Nombre del grupo de materiales',
    example: 'HERRAMIENTAS',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del grupo es obligatorio' })
  name: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría (por defecto: 1 - Pendiente)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  categoryId?: number;
}
