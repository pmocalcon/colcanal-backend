import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DirectorBudgetStatus } from '../../../database/entities/director-budget.entity';

export class FilterDirectorBudgetsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  workId?: number;

  @ApiProperty({ required: false, description: 'Comma-separated company IDs' })
  @IsOptional()
  companyId?: string;

  @ApiProperty({ required: false, enum: DirectorBudgetStatus })
  @IsOptional()
  @IsEnum(DirectorBudgetStatus)
  status?: DirectorBudgetStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  createdBy?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;
}
