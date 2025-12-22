import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Nombre del rol (único en el sistema)',
    example: 'Supervisor de Compras',
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: 'El nombre del rol debe ser texto' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
  nombreRol: string;

  @ApiProperty({
    description: 'Descripción del rol y sus responsabilidades',
    example: 'Supervisa y aprueba las órdenes de compra del departamento',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  descripcion?: string;

  @ApiProperty({
    description: 'Categoría del rol para agrupación',
    example: 'Compras',
    required: false,
    enum: ['Administrativo', 'Compras', 'PMO', 'TICs', 'Gerencia', 'Operativo'],
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

  @ApiProperty({
    description: 'IDs de los permisos a asignar al rol',
    example: [1, 2, 3],
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray({ message: 'Los permisos deben ser un array' })
  @IsNumber({}, { each: true, message: 'Cada permiso debe ser un ID numérico' })
  permisoIds?: number[];

  @ApiProperty({
    description: 'IDs de las gestiones/módulos que puede acceder el rol',
    example: [1, 2],
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray({ message: 'Las gestiones deben ser un array' })
  @IsNumber({}, { each: true, message: 'Cada gestión debe ser un ID numérico' })
  gestionIds?: number[];
}
