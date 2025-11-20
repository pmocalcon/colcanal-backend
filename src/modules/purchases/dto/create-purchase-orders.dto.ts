import {
  IsArray,
  IsOptional,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderItemDto } from './purchase-order-item.dto';

export class CreatePurchaseOrdersDto {
  @IsDateString()
  @IsOptional()
  issueDate?: string; // If not provided, uses current date

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
