export declare class ItemDecisionDto {
    itemId: number;
    decision: 'approve' | 'reject';
    comments?: string;
}
export declare class ReviewRequisitionDto {
    decision: 'approve' | 'reject';
    comments?: string;
    itemDecisions?: ItemDecisionDto[];
}
