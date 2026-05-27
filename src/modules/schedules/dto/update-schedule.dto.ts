import { IsDateString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleItemUpdateDto {
  @ApiProperty({ example: 5 })
  @IsNumber()
  ucapId: number;

  @ApiProperty({ example: 3.5 })
  @IsNumber()
  @Min(0)
  executedQuantity: number;

  @ApiProperty({ required: false, example: '2025-05-13' })
  @IsOptional()
  @IsDateString()
  ucapStartDate?: string | null;

  @ApiProperty({ required: false, example: '2025-05-28' })
  @IsOptional()
  @IsDateString()
  ucapEndDate?: string | null;
}

export class UpdateScheduleDto {
  @ApiProperty({ required: false, example: '2025-05-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiProperty({ required: false, example: '2025-06-24' })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiProperty({ required: false, example: '2025-04-28' })
  @IsOptional()
  @IsDateString()
  contractualStart?: string | null;

  @ApiProperty({ required: false, example: '2025-09-05' })
  @IsOptional()
  @IsDateString()
  contractualEnd?: string | null;

  @ApiProperty({ type: [ScheduleItemUpdateDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemUpdateDto)
  items?: ScheduleItemUpdateDto[];
}
