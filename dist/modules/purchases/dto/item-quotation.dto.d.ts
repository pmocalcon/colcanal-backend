import { SupplierQuotationDto } from './supplier-quotation.dto';
export declare class ItemQuotationDto {
    itemId: number;
    action: 'cotizar' | 'no_requiere';
    suppliers?: SupplierQuotationDto[];
    justification?: string;
}
