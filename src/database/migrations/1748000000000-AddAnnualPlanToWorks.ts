import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnualPlanToWorks1748000000000 implements MigrationInterface {
  name = 'AddAnnualPlanToWorks1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE works ADD COLUMN IF NOT EXISTS annual_plan INT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE works DROP COLUMN IF EXISTS annual_plan;
    `);
  }
}
