import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

// ============ Parametrizacion CREG por municipio ============

export class SaveCregParametrizacionDto {
  @ApiProperty({ type: Object, description: "Parametros CREG del municipio (JSON libre)" })
  @IsObject()
  data: Record<string, any>;
}

// ============ Censo fisico por municipio ============

export class SaveCregCensoDto {
  @ApiProperty({ type: Object, description: "Censo fisico del municipio (fechas + cantidades por UCAP y mes)" })
  @IsObject()
  data: Record<string, any>;
}

// ============ Configuracion por municipio ============

export class UpsertCregConfigDto {
  @ApiProperty()
  @IsNumber()
  pctEngineering: number;

  @ApiProperty()
  @IsNumber()
  pctAdministration: number;

  @ApiProperty()
  @IsNumber()
  pctInspection: number;

  @ApiProperty()
  @IsNumber()
  pctInterventoria: number;

  @ApiProperty()
  @IsNumber()
  pctFinancial: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  ippBase?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  ippCurrent?: number | null;
}

// ============ Hoja de costos de una UCAP ============

export class UcapCostItemDto {
  @ApiProperty({ enum: ["material", "transporte", "obra_civil", "montaje"] })
  @IsIn(["material", "transporte", "obra_civil", "montaje"])
  section: "material" | "transporte" | "obra_civil" | "montaje";

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  materialId?: number | null;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class SaveUcapCostSheetDto {
  @ApiProperty({ required: false, description: "Codigo de la UCAP (si se quiere renombrar)" })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ required: false, description: "Descripcion de la UCAP" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, nullable: true, description: "Grupo/categoria de la UCAP" })
  @IsOptional()
  @IsString()
  grupo?: string | null;

  @ApiProperty({ required: false, nullable: true, description: "IPP inicial (base) de la UCAP" })
  @IsOptional()
  @IsNumber()
  initialIpp?: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Valor manual; solo se usa cuando la hoja no tiene lineas",
  })
  @IsOptional()
  @IsNumber()
  roundedValue?: number | null;

  @ApiProperty()
  @IsNumber()
  pctEngineering: number;

  @ApiProperty()
  @IsNumber()
  pctAdministration: number;

  @ApiProperty()
  @IsNumber()
  pctInspection: number;

  @ApiProperty()
  @IsNumber()
  pctInterventoria: number;

  @ApiProperty()
  @IsNumber()
  pctFinancial: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  pctTransport?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  pctRetieRetilap?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  pctEnvironmental?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  ippCurrent?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  ucapMonth?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  ucapYear?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  powerNominal?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  powerLosses?: number | null;

  @ApiProperty({ type: [UcapCostItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UcapCostItemDto)
  items: UcapCostItemDto[];
}

/** Agregar un apellido/variante a una UCAP. */
export class AddUcapApellidoDto {
  @ApiProperty({ description: "Nombre del apellido/variante (p. ej. 'Acta 001-2024')" })
  @IsString()
  apellido: string;
}

/** Renombrar un apellido/variante existente. */
export class RenameUcapApellidoDto {
  @ApiProperty({ description: "Nuevo nombre del apellido/variante" })
  @IsString()
  apellido: string;
}

/**
 * Crea la UCAP y guarda su hoja de costos en una sola llamada.
 * `code` y `description` se heredan de SaveUcapCostSheetDto y aqui son obligatorios
 * (se validan en el servicio, porque el decorador @IsOptional del padre no se puede quitar).
 */
export class CreateCregUnitDto extends SaveUcapCostSheetDto {
  @ApiProperty()
  @IsNumber()
  companyId: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  projectId?: number | null;
}
