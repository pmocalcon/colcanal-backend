import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'ID único del usuario en la base de datos',
    example: 1,
    type: Number,
  })
  userId: number;

  @ApiProperty({
    description: 'Correo electrónico corporativo del usuario',
    example: 'admin@canalco.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Carlos Rodríguez',
    type: String,
  })
  nombre: string;

  @ApiProperty({
    description: 'Cargo del usuario en la organización',
    example: 'Gerente de Compras',
    type: String,
    required: false,
  })
  cargo: string;

  @ApiProperty({
    description: 'ID del rol asignado al usuario',
    example: 1,
    type: Number,
  })
  rolId: number;

  @ApiProperty({
    description:
      'Nombre del rol (Gerencia, Director PMO, Analista PMO, PQRS, Compras, etc.)',
    example: 'Gerencia',
    type: String,
  })
  nombreRol: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description:
      'Token de acceso JWT. Válido por 1 hora. Usar este token en el header Authorization: Bearer {token} para autenticar las peticiones',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AY2FuYWxjby5jb20iLCJpYXQiOjE3NjIzMTEwMjAsImV4cCI6MTc2MjMxNDYyMH0.7FQLE4qVQoAGgmsiW0kzzbG3P6LVT5Zd9iJrehi1ohc',
    type: String,
  })
  accessToken: string;

  @ApiProperty({
    description:
      'Token de refresco JWT. Válido por 7 días. Usar este token para obtener un nuevo accessToken cuando expire usando el endpoint /auth/refresh',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AY2FuYWxjby5jb20iLCJpYXQiOjE3NjIzMTEwMjAsImV4cCI6MTc2MjkxNTgyMH0.iW4VdqdCqO6Wccp4esSDtimQNyGHSOAG7BOYy5aWEQQ',
    type: String,
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Información completa del usuario autenticado',
    type: UserResponseDto,
  })
  user: UserResponseDto;
}
