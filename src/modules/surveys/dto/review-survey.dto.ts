import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export enum SurveyBlock {
  BUDGET = 'budget',
  INVESTMENT = 'investment',
  MATERIALS = 'materials',
  TRAVEL_EXPENSES = 'travelExpenses',
}

export enum BlockReviewStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
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

export class ReviewBlockDto {
  @ApiProperty({
    description: 'Block to review',
    enum: SurveyBlock,
    example: 'budget',
  })
  @IsEnum(SurveyBlock)
  block: SurveyBlock;

  @ApiProperty({
    description: 'Block review status',
    enum: BlockReviewStatus,
    example: 'approved',
  })
  @IsEnum(BlockReviewStatus)
  status: BlockReviewStatus;

  @ApiProperty({
    description: 'Comments for this block (required for rejection)',
    example: 'UCAP quantities need to be verified',
    required: false,
  })
  @IsOptional()
  @IsString()
  comments?: string;
}
