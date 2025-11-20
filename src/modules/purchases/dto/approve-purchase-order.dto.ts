import {
  IsArray,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ItemApprovalDecision {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class ItemApprovalDto {
  @IsNumber()
  poItemId: number;

  @IsEnum(ItemApprovalDecision)
  decision: ItemApprovalDecision;

  @IsString()
  @IsOptional()
  comments?: string;
}

export class ApprovePurchaseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemApprovalDto)
  items: ItemApprovalDto[];

  @IsString()
  @IsOptional()
  generalComments?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string; // Obligatorio si todos son rechazados
}
