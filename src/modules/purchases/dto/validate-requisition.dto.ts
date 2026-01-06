import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para validación de requisiciones con Obra
 *
 * Este DTO se usa cuando un Director de Proyecto valida una requisición
 * creada por PQRS o Coordinador Operativo que tiene campo "obra" diligenciado.
 *
 * Flujo:
 * - Si valida (validate): La requisición pasa a estado "pendiente" para que
 *   el Director Técnico la revise.
 * - Si rechaza (reject): La requisición vuelve al solicitante con estado
 *   "rechazada_validador".
 */
export class ValidateRequisitionDto {
  @ApiProperty({
    description:
      'Decisión del Director de Proyecto sobre la validación de la requisición con obra.\n\n' +
      '**Opciones:**\n' +
      '- **validate**: Validar la requisición (pasa a revisión por Director Técnico)\n' +
      '- **reject**: Rechazar la requisición (vuelve al creador con comentarios)\n\n' +
      'La validación confirma que la información de la obra es correcta y los materiales son necesarios.',
    enum: ['validate', 'reject'],
    example: 'validate',
    type: String,
    required: true,
  })
  @IsIn(['validate', 'reject'], {
    message: 'La decisión debe ser "validate" o "reject"',
  })
  decision: 'validate' | 'reject';

  @ApiProperty({
    description:
      'Comentarios del Director de Proyecto sobre la validación.\n' +
      'Opcional al validar, OBLIGATORIO al rechazar para justificar la decisión.',
    example: 'Información de obra verificada, materiales necesarios para la instalación',
    type: String,
    required: false,
  })
  @ValidateIf((o) => o.decision === 'reject')
  @IsNotEmpty({ message: 'Los comentarios son obligatorios al rechazar una validación' })
  @IsString({ message: 'Los comentarios deben ser texto' })
  @ValidateIf((o) => o.decision === 'validate')
  @IsOptional()
  @IsString({ message: 'Los comentarios deben ser texto' })
  comments?: string;
}
