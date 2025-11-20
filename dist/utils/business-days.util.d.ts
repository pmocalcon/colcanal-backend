export declare function isBusinessDay(date: Date): boolean;
export declare function addBusinessDays(startDate: Date, businessDays: number): Date;
export declare function calculateBusinessDaysBetween(startDate: Date, endDate: Date): number;
export declare function calculateSLA(startDate: Date, businessDays: number): {
    isOverdue: boolean;
    deadline: Date;
    daysOverdue: number;
};
export declare const SLA_CONFIG: Record<string, number>;
export declare function getSLAForStatus(statusCode: string): number;
