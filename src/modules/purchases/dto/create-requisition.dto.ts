import {
  IsNumber,
  IsOptional,
  IsArray,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateRequisitionItemDto } from './create-requisition-item.dto';

export class CreateRequisitionDto {
  @ApiProperty({
    description:
      'ID de la empresa que realiza la requisición. Consulta las empresas disponibles en GET /purchases/master-data/companies\n\n' +
      '**Empresas principales:**\n' +
      '- 1: Canales & Contactos (requiere projectId)\n' +
      '- 2-8: Uniones Temporales (UT El Cerrito, UT Circasia, etc.)',
    example: 1,
    type: Number,
    required: true,
  })
  @IsNumber({}, { message: 'El companyId debe ser un número válido' })
  @Type(() => Number)
  companyId: number;

  @ApiProperty({
    description:
      'ID del proyecto asociado (requerido para Canales & Contactos, opcional para otras empresas). Consulta los proyectos en GET /purchases/master-data/projects\n\n' +
      '**Proyectos de Canales & Contactos (companyId: 1):**\n' +
      '- 1: Administrativo (Prefijo: ADM)\n' +
      '- 2: Ciudad Bolívar (Prefijo: CB)\n' +
      '- 3: Jericó (Prefijo: JE)\n' +
      '- 4: Pueblo Rico (Prefijo: PR)\n' +
      '- 5: Tarso (Prefijo: TA)',
    example: 2,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El projectId debe ser un número válido' })
  @Type(() => Number)
  projectId?: number;

  @ApiProperty({
    description: 'Nombre de la obra (campo opcional, alfanumérico)',
    example: 'Obra Principal - Sector Norte',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La obra debe ser una cadena de texto' })
  obra?: string;

  @ApiProperty({
    description: 'Código de la obra (campo opcional, alfanumérico)',
    example: 'OB-2025-001',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El código de obra debe ser una cadena de texto' })
  codigoObra?: string;

  @ApiProperty({
    description:
      'Lista de materiales a solicitar. Debe incluir al menos un ítem. Cada ítem debe tener materialId, quantity y opcionalmente observation.',
    type: [CreateRequisitionItemDto],
    isArray: true,
    minItems: 1,
    example: [
      {
        materialId: 1,
        quantity: 10,
        observation: 'Cable #10 para instalación principal',
      },
      {
        materialId: 3,
        quantity: 5,
        observation: 'Breakers para tablero secundario',
      },
    ],
  })
  @IsArray({ message: 'Los ítems deben ser un array' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => CreateRequisitionItemDto)
  items: CreateRequisitionItemDto[];
}
