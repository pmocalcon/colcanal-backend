import {
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuthorizationDto {
  @ApiProperty({
    description: 'ID del usuario que será autorizado (subordinado)',
    example: 15,
  })
  @IsNumber({}, { message: 'El usuario autorizado debe ser un número válido' })
  usuarioAutorizadoId: number;

  @ApiProperty({
    description: 'Tipo de autorización: revision (nivel 1), autorizacion (nivel intermedio), aprobacion (nivel final)',
    example: 'revision',
    enum: ['revision', 'autorizacion', 'aprobacion'],
  })
  @IsString()
  @IsIn(['revision', 'autorizacion', 'aprobacion'], {
    message: 'El tipo de autorización debe ser: revision, autorizacion o aprobacion',
  })
  tipoAutorizacion: 'revision' | 'autorizacion' | 'aprobacion';

  @ApiPropertyOptional({
    description: 'ID de la gestión/módulo específico (2 = Compras). Si no se especifica, aplica a todos.',
    example: 2,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La gestión debe ser un número válido' })
  gestionId?: number;
}

export class BulkAuthorizationDto {
  @ApiProperty({
    description: 'ID del usuario autorizador (supervisor)',
    example: 4,
  })
  @IsNumber()
  usuarioAutorizadorId: number;

  @ApiProperty({
    description: 'Lista de IDs de usuarios que serán autorizados (subordinados)',
    example: [12, 13, 14],
    type: [Number],
  })
  @IsNumber({}, { each: true })
  usuariosAutorizadosIds: number[];

  @ApiProperty({
    description: 'Tipo de autorización',
    example: 'revision',
    enum: ['revision', 'autorizacion', 'aprobacion'],
  })
  @IsString()
  @IsIn(['revision', 'autorizacion', 'aprobacion'])
  tipoAutorizacion: 'revision' | 'autorizacion' | 'aprobacion';

  @ApiPropertyOptional({
    description: 'ID de la gestión/módulo específico',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  gestionId?: number;
}
