export declare class ReceiptItemDto {
    poItemId: number;
    quantityReceived: number;
    receivedDate: string;
    observations?: string;
    overdeliveryJustification?: string;
}
export declare class CreateMaterialReceiptDto {
    items: ReceiptItemDto[];
}
