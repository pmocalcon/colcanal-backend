export declare class ItemPriceDto {
    itemId: number;
    quotationId?: number;
    unitPrice: number;
    hasIva: boolean;
    discount?: number;
}
export declare class AssignPricesDto {
    items: ItemPriceDto[];
}
