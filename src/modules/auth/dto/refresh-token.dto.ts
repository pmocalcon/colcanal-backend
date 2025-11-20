import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description:
      'Token de refresco JWT obtenido en el login. Se utiliza para obtener un nuevo accessToken sin necesidad de volver a autenticarse',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AY2FuYWxjby5jb20iLCJpYXQiOjE3NjIzMTEwMjAsImV4cCI6MTc2MjkxNTgyMH0.iW4VdqdCqO6Wccp4esSDtimQNyGHSOAG7BOYy5aWEQQ',
    type: String,
    required: true,
  })
  @IsString({ message: 'El token debe ser una cadena de texto válida' })
  @IsNotEmpty({ message: 'El refresh token es obligatorio' })
  refreshToken: string;
}
