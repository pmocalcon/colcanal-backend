import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Nombre o razón social del proveedor',
    example: 'Ferretería El Constructor S.A.S',
    maxLength: 200,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del proveedor es requerido' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  name: string;

  @ApiProperty({
    description: 'NIT o Cédula del proveedor (sin dígito de verificación)',
    example: '900123456',
    maxLength: 50,
  })
  @IsString({ message: 'El NIT/CC debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El NIT/CC del proveedor es requerido' })
  @MaxLength(50, { message: 'El NIT/CC no puede exceder 50 caracteres' })
  @Matches(/^[0-9-]+$/, {
    message: 'El NIT/CC solo puede contener números y guiones',
  })
  nitCc: string;

  @ApiProperty({
    description: 'Teléfono de contacto del proveedor',
    example: '3001234567',
    maxLength: 50,
  })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El teléfono del proveedor es requerido' })
  @MaxLength(50, { message: 'El teléfono no puede exceder 50 caracteres' })
  phone: string;

  @ApiProperty({
    description: 'Dirección física del proveedor',
    example: 'Carrera 45 #32-10, Zona Industrial',
    maxLength: 200,
  })
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección del proveedor es requerida' })
  @MaxLength(200, { message: 'La dirección no puede exceder 200 caracteres' })
  address: string;

  @ApiProperty({
    description: 'Ciudad donde se encuentra el proveedor',
    example: 'Medellín',
    maxLength: 100,
  })
  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La ciudad del proveedor es requerida' })
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  city: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del proveedor',
    example: 'ventas@ferreteria.com',
    maxLength: 100,
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  @MaxLength(100, { message: 'El correo no puede exceder 100 caracteres' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Nombre de la persona de contacto',
    example: 'Carlos Rodríguez',
    maxLength: 100,
  })
  @IsString({ message: 'El nombre del contacto debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, {
    message: 'El nombre del contacto no puede exceder 100 caracteres',
  })
  contactPerson?: string;
}
