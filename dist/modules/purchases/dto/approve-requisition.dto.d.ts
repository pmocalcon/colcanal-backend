export declare class ItemDecisionDto {
    itemId: number;
    decision: 'approve' | 'reject';
    comments?: string;
}
export declare class ApproveRequisitionDto {
    comments?: string;
    itemDecisions?: ItemDecisionDto[];
}
export declare class RejectRequisitionDto {
    comments: string;
    itemDecisions?: ItemDecisionDto[];
}
