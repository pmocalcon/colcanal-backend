import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsDateString,
  ValidateNested,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSurveyBudgetItemDto {
  @ApiProperty({ description: 'UCAP ID', example: 1 })
  @IsNumber()
  @Type(() => Number)
  ucapId: number;

  @ApiProperty({ description: 'Quantity', example: 4 })
  @IsNumber()
  @Type(() => Number)
  quantity: number;
}

export class CreateSurveyInvestmentItemDto {
  @ApiProperty({ description: 'Order number', example: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  orderNumber?: number;

  @ApiProperty({ description: 'Point identifier', example: 'P1' })
  @IsString()
  @MaxLength(20)
  point: string;

  @ApiProperty({ description: 'Description', example: 'Expansión Luminaria' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Luminaire quantity', example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  luminaireQuantity?: number;

  @ApiProperty({ description: 'Relocated luminaire quantity', example: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  relocatedLuminaireQuantity?: number;

  @ApiProperty({ description: 'Pole quantity', example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  poleQuantity?: number;

  @ApiProperty({ description: 'Braided network (meters)', example: 50 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  braidedNetwork?: number;

  @ApiProperty({ description: 'Latitude', example: 4.6186200000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiProperty({ description: 'Longitude', example: -75.6412000000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;
}

export class CreateSurveyMaterialDto {
  @ApiProperty({ description: 'Material ID from catalog', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  materialId?: number;

  @ApiProperty({ description: 'Material code', example: '147' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  materialCode?: string;

  @ApiProperty({ description: 'Description', example: 'PROYECTOR LED DE 100W' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Unit of measure', example: 'Unidad' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unitOfMeasure?: string;

  @ApiProperty({ description: 'Quantity', example: 4 })
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ description: 'Observations', example: 'Por tiempos se sugiere compra con Sylvania' })
  @IsOptional()
  @IsString()
  observations?: string;
}

export enum TravelExpenseTypeDto {
  TOLLS = 'tolls',
  PARKING = 'parking',
  LODGING = 'lodging',
  FOOD = 'food',
  FUEL = 'fuel',
  ADDITIONAL_CREW = 'additional_crew',
  DAY_HOURS = 'day_hours',
  HOLIDAY_OVERTIME = 'holiday_overtime',
}

export class CreateSurveyTravelExpenseDto {
  @ApiProperty({
    description: 'Expense type',
    enum: TravelExpenseTypeDto,
    example: 'tolls',
  })
  @IsEnum(TravelExpenseTypeDto)
  expenseType: TravelExpenseTypeDto;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ description: 'Observations', required: false })
  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreateSurveyDto {
  @ApiProperty({
    description: 'Work ID this survey belongs to',
    example: 1,
  })
  @IsNumber()
  @Type(() => Number)
  workId: number;

  @ApiProperty({
    description: 'Request date',
    example: '2025-11-04',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @ApiProperty({
    description: 'Survey date',
    example: '2025-11-04',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  surveyDate?: string;

  @ApiProperty({
    description: 'Person who received the survey',
    example: 'Yamile Rodriguez Marín',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  receivedBy?: string;

  @ApiProperty({
    description: 'Requires photometric studies',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresPhotometricStudies?: boolean;

  @ApiProperty({
    description: 'Requires RETIE certification',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresRetieCertification?: boolean;

  @ApiProperty({
    description: 'Requires RETILAP certification',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresRetilapCertification?: boolean;

  @ApiProperty({
    description: 'Requires civil work',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresCivilWork?: boolean;

  @ApiProperty({
    description: 'Budget items (UCAP based)',
    type: [CreateSurveyBudgetItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyBudgetItemDto)
  budgetItems?: CreateSurveyBudgetItemDto[];

  @ApiProperty({
    description: 'Investment items (points with GPS)',
    type: [CreateSurveyInvestmentItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyInvestmentItemDto)
  investmentItems?: CreateSurveyInvestmentItemDto[];

  @ApiProperty({
    description: 'Materials for this survey',
    type: [CreateSurveyMaterialDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyMaterialDto)
  materials?: CreateSurveyMaterialDto[];

  @ApiProperty({
    description: 'Travel expenses',
    type: [CreateSurveyTravelExpenseDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyTravelExpenseDto)
  travelExpenses?: CreateSurveyTravelExpenseDto[];
}
