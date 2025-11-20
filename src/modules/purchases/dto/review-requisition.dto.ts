import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ItemDecisionDto {
  @ApiProperty({
    description: 'ID del ítem de requisición',
    example: 1,
    type: Number,
  })
  @IsNumber()
  itemId: number;

  @ApiProperty({
    description: 'Decisión sobre el ítem individual',
    enum: ['approve', 'reject'],
    example: 'approve',
  })
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @ApiProperty({
    description: 'Comentarios sobre el ítem (obligatorio si se rechaza)',
    example: 'Material innecesario para el proyecto',
    required: false,
  })
  @ValidateIf((o) => o.decision === 'reject')
  @IsNotEmpty({ message: 'Los comentarios son obligatorios al rechazar un ítem' })
  @IsString()
  @ValidateIf((o) => o.decision === 'approve')
  @IsOptional()
  @IsString()
  comments?: string;
}

export class ReviewRequisitionDto {
  @ApiProperty({
    description:
      'Decisión del Director sobre la requisición (Nivel 1 - Revisión)\n\n' +
      '**Opciones:**\n' +
      '- **approve**: Aprobar la requisición (pasa a Gerencia para aprobación final)\n' +
      '- **reject**: Rechazar la requisición (vuelve al creador con comentarios)\n\n' +
      'Si se proporciona itemDecisions, esta decisión aplica como decisión general y se guardan las decisiones individuales',
    enum: ['approve', 'reject'],
    example: 'approve',
    type: String,
    required: true,
  })
  @IsIn(['approve', 'reject'], {
    message: 'La decisión debe ser "approve" o "reject"',
  })
  decision: 'approve' | 'reject';

  @ApiProperty({
    description:
      'Comentarios del Director sobre la revisión. Opcional al aprobar, OBLIGATORIO al rechazar para justificar la decisión.',
    example: 'Requisición aprobada, materiales necesarios para el proyecto',
    type: String,
    required: false,
  })
  @ValidateIf((o) => o.decision === 'reject')
  @IsNotEmpty({ message: 'Los comentarios son obligatorios al rechazar una requisición' })
  @IsString({ message: 'Los comentarios deben ser texto' })
  @ValidateIf((o) => o.decision === 'approve')
  @IsOptional()
  @IsString({ message: 'Los comentarios deben ser texto' })
  comments?: string;

  @ApiProperty({
    description:
      'Decisiones individuales por ítem (opcional). Si se proporcionan, se guardarán las aprobaciones/rechazos a nivel de ítem.',
    type: [ItemDecisionDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDecisionDto)
  itemDecisions?: ItemDecisionDto[];
}
