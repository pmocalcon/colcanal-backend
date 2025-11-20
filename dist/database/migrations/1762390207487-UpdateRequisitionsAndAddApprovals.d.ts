import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class UpdateRequisitionsAndAddApprovals1762390207487 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
