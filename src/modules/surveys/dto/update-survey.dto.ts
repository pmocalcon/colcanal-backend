import { PartialType } from '@nestjs/swagger';
import { CreateSurveyDto } from './create-survey.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSurveyDto extends PartialType(CreateSurveyDto) {
  @ApiProperty({
    description: 'Previous month IPP (set by Technical Director)',
    example: 185.51,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  previousMonthIpp?: number;
}
