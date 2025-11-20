import { MigrationInterface, QueryRunner } from "typeorm";
export declare class ConvertPurchaseOrderApprovalStatusToFK1763343323271 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
