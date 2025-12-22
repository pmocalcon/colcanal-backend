import {
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsIn,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateRequisitionItemDto } from './create-requisition-item.dto';

export class UpdateRequisitionDto {
  @ApiProperty({
    description: 'ID de la empresa',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  companyId?: number;

  @ApiProperty({
    description: 'ID del proyecto',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectId?: number;

  @ApiProperty({
    description:
      'Prioridad de la requisición. Las requisiciones con prioridad "alta" aparecerán primero en todas las listas.',
    example: 'normal',
    enum: ['alta', 'normal'],
    required: false,
  })
  @IsOptional()
  @IsIn(['alta', 'normal'], { message: 'La prioridad debe ser "alta" o "normal"' })
  priority?: 'alta' | 'normal';

  @ApiProperty({
    description: 'Ítems de la requisición',
    type: [CreateRequisitionItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => CreateRequisitionItemDto)
  items?: CreateRequisitionItemDto[];
}
