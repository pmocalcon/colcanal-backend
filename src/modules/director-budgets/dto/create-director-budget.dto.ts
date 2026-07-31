import {
  IsArray,
  IsBoolean,
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasIva?: boolean;
}

export class CreateDirectorBudgetDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  workId?: number | null;

  // Acta que origina el presupuesto (empresa, proyecto, número). El número solo no
  // identifica un acta: se repite entre municipios.
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  actaCompanyId?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  actaProjectId?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  actaNumber?: string | null;

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
  companyName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fuenteFinanciacion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valorMinimoExcedentes?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valorActualExcedentes?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  valorActualExcedentesTexto?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  saldoDisponible?: number | null;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  estampillaPct?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  estampillaPctEj?: number | null;

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
