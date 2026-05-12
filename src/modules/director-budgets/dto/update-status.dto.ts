import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DirectorBudgetStatus } from '../../../database/entities/director-budget.entity';

export class UpdateBudgetStatusDto {
  @ApiProperty({ enum: DirectorBudgetStatus })
  @IsEnum(DirectorBudgetStatus)
  status: DirectorBudgetStatus;
}
