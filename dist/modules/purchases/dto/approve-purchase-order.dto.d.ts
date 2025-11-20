export declare enum ItemApprovalDecision {
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare class ItemApprovalDto {
    poItemId: number;
    decision: ItemApprovalDecision;
    comments?: string;
}
export declare class ApprovePurchaseOrderDto {
    items: ItemApprovalDto[];
    generalComments?: string;
    rejectionReason?: string;
}
