import { IsOptional, IsNumber, IsString, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SurveyStatusFilter {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum BlockStatusFilter {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class FilterSurveysDto {
  @ApiProperty({
    description: 'Filter by company ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  companyId?: number;

  @ApiProperty({
    description: 'Filter by project ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectId?: number;

  @ApiProperty({
    description: 'Filter by work ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  workId?: number;

  @ApiProperty({
    description: 'Filter by status',
    enum: SurveyStatusFilter,
    required: false,
  })
  @IsOptional()
  @IsEnum(SurveyStatusFilter)
  status?: SurveyStatusFilter;

  @ApiProperty({
    description: 'Filter by creator user ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  createdBy?: number;

  @ApiProperty({
    description: 'Filter surveys from this date',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({
    description: 'Filter surveys until this date',
    example: '2025-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiProperty({
    description: 'Search by project code',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectCode?: string;

  @ApiProperty({
    description: 'Page number',
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiProperty({
    description: 'Items per page',
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    description: 'Search by project code, work name, or record number',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by budget block status',
    enum: BlockStatusFilter,
    required: false,
  })
  @IsOptional()
  @IsEnum(BlockStatusFilter)
  budgetStatus?: BlockStatusFilter;

  @ApiProperty({
    description: 'Filter by investment block status',
    enum: BlockStatusFilter,
    required: false,
  })
  @IsOptional()
  @IsEnum(BlockStatusFilter)
  investmentStatus?: BlockStatusFilter;

  @ApiProperty({
    description: 'Filter by materials block status',
    enum: BlockStatusFilter,
    required: false,
  })
  @IsOptional()
  @IsEnum(BlockStatusFilter)
  materialsStatus?: BlockStatusFilter;

  @ApiProperty({
    description: 'Filter by travel expenses block status',
    enum: BlockStatusFilter,
    required: false,
  })
  @IsOptional()
  @IsEnum(BlockStatusFilter)
  travelExpensesStatus?: BlockStatusFilter;
}
