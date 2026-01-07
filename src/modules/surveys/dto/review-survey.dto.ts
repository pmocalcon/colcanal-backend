import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ReviewSurveyDto {
  @ApiProperty({
    description: 'Review action',
    enum: ReviewAction,
    example: 'approve',
  })
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ApiProperty({
    description: 'Previous month IPP value (required for approval)',
    example: 185.51,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  previousMonthIpp?: number;

  @ApiProperty({
    description: 'Rejection comments (required for rejection)',
    example: 'Missing GPS coordinates for points P3 and P4',
    required: false,
  })
  @IsOptional()
  @IsString()
  rejectionComments?: string;
}
