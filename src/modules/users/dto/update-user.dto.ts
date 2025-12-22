import {
  IsEmail,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Correo electrónico corporativo del usuario',
    example: 'usuario.actualizado@canalcongroup.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @Matches(/@(canalcongroup\.com|canalco\.com|alumbrado\.com)$/, {
    message: 'El correo debe ser del dominio corporativo',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Nueva contraseña del usuario (mínimo 8 caracteres)',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Nombre completo del usuario',
    example: 'Juan Carlos Pérez García',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Cargo o puesto del usuario',
    example: 'Director de Compras',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El cargo debe tener al menos 3 caracteres' })
  cargo?: string;

  @ApiPropertyOptional({
    description: 'ID del rol asignado al usuario',
    example: 3,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El rol debe ser un número válido' })
  rolId?: number;

  @ApiPropertyOptional({
    description: 'Estado del usuario (activo/inactivo)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
