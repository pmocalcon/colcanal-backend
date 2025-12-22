import {
  IsEmail,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Correo electrónico corporativo del usuario',
    example: 'nuevo.usuario@canalcongroup.com',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @Matches(/@(canalcongroup\.com|canalco\.com|alumbrado\.com)$/, {
    message: 'El correo debe ser del dominio corporativo (@canalcongroup.com, @canalco.com, @alumbrado.com)',
  })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario (mínimo 8 caracteres)',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Carlos Pérez',
  })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  nombre: string;

  @ApiProperty({
    description: 'Cargo o puesto del usuario',
    example: 'Analista de Compras',
  })
  @IsString()
  @MinLength(3, { message: 'El cargo debe tener al menos 3 caracteres' })
  cargo: string;

  @ApiProperty({
    description: 'ID del rol asignado al usuario',
    example: 5,
  })
  @IsNumber({}, { message: 'El rol debe ser un número válido' })
  rolId: number;

  @ApiPropertyOptional({
    description: 'Estado del usuario (activo/inactivo)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean = true;
}
