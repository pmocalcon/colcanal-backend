import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ItemQuotationDto } from './item-quotation.dto';

export class ManageQuotationDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe cotizar al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => ItemQuotationDto)
  items: ItemQuotationDto[];
}
