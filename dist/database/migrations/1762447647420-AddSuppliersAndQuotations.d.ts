import { MigrationInterface, QueryRunner } from "typeorm";
export declare class AddSuppliersAndQuotations1762447647420 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
