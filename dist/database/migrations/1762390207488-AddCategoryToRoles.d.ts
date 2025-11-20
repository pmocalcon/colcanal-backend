import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddCategoryToRoles1762390207488 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
