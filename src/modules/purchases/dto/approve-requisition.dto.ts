import { IsOptional, IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, IsIn, ValidateIf } from 'class-validator';
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

export class ApproveRequisitionDto {
  @ApiProperty({
    description:
      'Comentarios opcionales de la Gerencia al aprobar la requisición (Nivel 2 - Aprobación Final). Se recomienda agregar observaciones si hay condiciones especiales.',
    example: 'Aprobado por gerencia, proceder con la compra',
    type: String,
    required: false,
  })
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

export class RejectRequisitionDto {
  @ApiProperty({
    description:
      'Comentarios OBLIGATORIOS de la Gerencia al rechazar la requisición (Nivel 2 - Aprobación Final). Debe explicar claramente el motivo del rechazo (ej: presupuesto insuficiente, no prioritario, materiales innecesarios, etc.)',
    example:
      'Presupuesto insuficiente para esta requisición en el trimestre actual. Solicitar nuevamente en Q2.',
    type: String,
    required: true,
  })
  @IsString({ message: 'Los comentarios deben ser texto' })
  @IsNotEmpty({ message: 'Los comentarios son obligatorios al rechazar' })
  comments: string;

  @ApiProperty({
    description:
      'Decisiones individuales por ítem (opcional). Si se proporcionan, se guardarán las aprobaciones/rechazos a nivel de ítem antes de rechazar la requisición completa.',
    type: [ItemDecisionDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDecisionDto)
  itemDecisions?: ItemDecisionDto[];
}
