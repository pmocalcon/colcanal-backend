import { IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignUserGestionesDto {
  @ApiProperty({
    description: 'IDs de las gestiones/módulos a asignar al usuario (reemplaza los existentes)',
    example: [1, 2, 3, 5],
    type: [Number],
  })
  @IsArray({ message: 'Las gestiones deben ser un array' })
  @IsNumber({}, { each: true, message: 'Cada gestión debe ser un ID numérico' })
  gestionIds: number[];
}
