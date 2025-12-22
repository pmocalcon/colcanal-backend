import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'Nombre del rol',
    example: 'Supervisor de Compras',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre del rol debe ser texto' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
  nombreRol?: string;

  @ApiProperty({
    description: 'Descripción del rol',
    example: 'Supervisa y aprueba las órdenes de compra',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  descripcion?: string;

  @ApiProperty({
    description: 'Categoría del rol',
    example: 'Compras',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Módulo por defecto al iniciar sesión',
    example: 'compras',
    required: false,
  })
  @IsOptional()
  @IsString()
  defaultModule?: string;
}

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'IDs de los permisos a asignar (reemplaza los existentes)',
    example: [1, 2, 3, 5],
    type: [Number],
  })
  @IsArray({ message: 'Los permisos deben ser un array' })
  @IsNumber({}, { each: true, message: 'Cada permiso debe ser un ID numérico' })
  permisoIds: number[];
}

export class AssignGestionesDto {
  @ApiProperty({
    description: 'IDs de las gestiones/módulos a asignar (reemplaza los existentes)',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray({ message: 'Las gestiones deben ser un array' })
  @IsNumber({}, { each: true, message: 'Cada gestión debe ser un ID numérico' })
  gestionIds: number[];
}
