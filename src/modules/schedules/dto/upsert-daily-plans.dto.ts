import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';

export class DailyPlanItemDto {
  @IsNumber()
  ucapId: number;

  @IsDateString()
  planDate: string;

  @IsNumber()
  @Min(0)
  plannedQuantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  executedQuantity?: number;
}

export class UpsertDailyPlansDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyPlanItemDto)
  items: DailyPlanItemDto[];
}
