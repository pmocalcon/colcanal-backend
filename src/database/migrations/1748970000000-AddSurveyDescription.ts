import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSurveyDescription1748970000000 implements MigrationInterface {
  name = 'AddSurveyDescription1748970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE surveys
      ADD COLUMN IF NOT EXISTS description TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE surveys
      DROP COLUMN IF EXISTS description
    `);
  }
}
