import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class MaterialLogItemDto {
  @IsOptional()
  @IsNumber()
  logId?: number;

  @IsString()
  materialCode: string;

  @IsOptional()
  @IsString()
  materialDescription?: string;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsDateString()
  usageDate: string;
}

export class UpsertMaterialLogsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialLogItemDto)
  items: MaterialLogItemDto[];
}
