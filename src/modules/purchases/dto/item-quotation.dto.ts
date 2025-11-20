import {
  IsNumber,
  IsString,
  IsIn,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SupplierQuotationDto } from './supplier-quotation.dto';

export class ItemQuotationDto {
  @IsNumber()
  itemId: number;

  @IsString()
  @IsIn(['cotizar', 'no_requiere'])
  action: 'cotizar' | 'no_requiere';

  // Suppliers: obligatorio si action = 'cotizar'
  @ValidateIf((o) => o.action === 'cotizar')
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un proveedor' })
  @ArrayMaxSize(2, { message: 'Máximo 2 proveedores por ítem' })
  @ValidateNested({ each: true })
  @Type(() => SupplierQuotationDto)
  suppliers?: SupplierQuotationDto[];

  // Justification: obligatorio si action = 'no_requiere'
  @ValidateIf((o) => o.action === 'no_requiere')
  @IsString()
  justification?: string;
}
