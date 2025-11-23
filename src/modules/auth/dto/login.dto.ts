import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description:
      'Correo electrónico corporativo. Solo se permite el dominio @canalcongroup.com',
    example: 'gerencia@canalcongroup.com',
    type: String,
    required: true,
    format: 'email',
  })
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @ApiProperty({
    description:
      'Contraseña del usuario. Debe tener al menos 6 caracteres',
    example: 'Canalco2025!',
    type: String,
    required: true,
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
