import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DirectorBudgetStatus } from '../../../database/entities/director-budget.entity';

export class CreateDirectorBudgetItemDto {
  @ApiProperty()
  @IsNumber()
  itemOrder: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  materialId?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cantidad?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  vrUnitario?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cantBodega?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  costoTransporte?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  ejecutado?: number | null;
}

export class CreateDirectorBudgetDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  workId?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  manoDeObra?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  manoDeObraEj?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  materialesInventario?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  materialesInventarioEj?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valorFacturado?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valorFacturadoEj?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  otrosCostos?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  otrosCostosEj?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  leg?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  legEj?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  retPct?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  retPctEj?: number | null;

  @ApiProperty({ required: false, enum: DirectorBudgetStatus })
  @IsOptional()
  @IsEnum(DirectorBudgetStatus)
  status?: DirectorBudgetStatus;

  @ApiProperty({ type: [CreateDirectorBudgetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDirectorBudgetItemDto)
  items: CreateDirectorBudgetItemDto[];
}

export class UpdateDirectorBudgetDto extends CreateDirectorBudgetDto {}
