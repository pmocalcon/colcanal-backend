import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitPriceToTravelExpenses1748100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "survey_travel_expenses"
      ADD COLUMN IF NOT EXISTS "unit_price" NUMERIC(15,2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "survey_travel_expenses"
      DROP COLUMN IF EXISTS "unit_price"
    `);
  }
}
