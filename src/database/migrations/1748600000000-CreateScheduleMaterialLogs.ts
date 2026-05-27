import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScheduleMaterialLogs1748600000000 implements MigrationInterface {
  name = 'CreateScheduleMaterialLogs1748600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schedule_material_logs (
        log_id               SERIAL PRIMARY KEY,
        schedule_id          INT NOT NULL REFERENCES schedules(schedule_id) ON DELETE CASCADE,
        material_code        VARCHAR(50) NOT NULL,
        material_description TEXT,
        unit_of_measure      VARCHAR(50),
        quantity             DECIMAL(10,2) NOT NULL,
        usage_date           DATE NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_material_logs`);
  }
}
