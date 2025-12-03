import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaterialDto {
  @ApiProperty({
    description: 'Código único del material',
    example: '4000',
  })
  @IsString()
  @IsNotEmpty({ message: 'El código del material es obligatorio' })
  code: string;

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
