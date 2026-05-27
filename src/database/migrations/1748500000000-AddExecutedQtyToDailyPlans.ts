import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExecutedQtyToDailyPlans1748500000000 implements MigrationInterface {
  name = 'AddExecutedQtyToDailyPlans1748500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE schedule_daily_plans
      ADD COLUMN IF NOT EXISTS executed_quantity DECIMAL(10,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE schedule_daily_plans DROP COLUMN IF EXISTS executed_quantity
    `);
  }
}
