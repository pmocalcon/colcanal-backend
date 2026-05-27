import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUcapDatesToScheduleItems1748300000000 implements MigrationInterface {
  name = 'AddUcapDatesToScheduleItems1748300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE schedule_items
      ADD COLUMN IF NOT EXISTS ucap_start_date DATE,
      ADD COLUMN IF NOT EXISTS ucap_end_date DATE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE schedule_items
      DROP COLUMN IF EXISTS ucap_start_date,
      DROP COLUMN IF EXISTS ucap_end_date
    `);
  }
}
