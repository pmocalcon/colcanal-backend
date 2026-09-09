import { IsString, IsOptional, IsNumber, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export enum ReviewAction {
  APPROVE = "approve",
  REJECT = "reject",
}

export enum SurveyBlock {
  /** La información de la obra, donde va el IPP del que dependen los demás bloques. */
  WORK_INFO = 'workInfo',
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
    description: "Review action",
    enum: ReviewAction,
    example: "approve",
  })
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ApiProperty({
    description: "Previous month IPP value (required for approval)",
    example: 185.51,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  previousMonthIpp?: number;

  @ApiProperty({
    description: "Rejection comments (required for rejection)",
    example: "Missing GPS coordinates for points P3 and P4",
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

  /**
   * El IPP del mes anterior, que solo tiene sentido al aprobar el bloque de la obra:
   * es el dato de ese bloque, y de él salen los totales ajustados de los demás. Va
   * aquí, y no en una llamada aparte, para que confirmarlo y aprobar sean lo mismo.
   */
  @ApiProperty({
    description: 'Previous month IPP (only when approving the work info block)',
    example: 189.2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  previousMonthIpp?: number;
}
