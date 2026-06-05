import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

/** Ejecución diaria de UCAPs → se guarda en schedule_daily_plans.executed_quantity */
export class DailyExecutionItemDto {
  @IsNumber()
  ucapId: number;

  @IsDateString()
  planDate: string;

  @IsNumber()
  @Min(0)
  executedQuantity: number;
}

export class UpsertDailyExecutionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyExecutionItemDto)
  items: DailyExecutionItemDto[];
}

/** Ejecución de materiales / actividades → se guarda en schedule_executions */
export class ExecutionItemDto {
  @IsString()
  itemKey: string;

  @IsOptional()
  @IsString()
  label?: string | null;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string | null;

  @IsOptional()
  @IsDateString()
  executionDate?: string | null;

  @IsNumber()
  @Min(0)
  quantity: number;
}

export class UpsertExecutionsDto {
  @IsIn(['material', 'activity'])
  execType: 'material' | 'activity';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExecutionItemDto)
  items: ExecutionItemDto[];
}
