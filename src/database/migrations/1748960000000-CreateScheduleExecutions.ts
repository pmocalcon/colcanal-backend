import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScheduleExecutions1748960000000 implements MigrationInterface {
  name = 'CreateScheduleExecutions1748960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schedule_executions (
        execution_id     SERIAL PRIMARY KEY,
        schedule_id      INTEGER NOT NULL REFERENCES schedules(schedule_id) ON DELETE CASCADE,
        exec_type        VARCHAR(20) NOT NULL,
        item_key         VARCHAR(100) NOT NULL,
        label            TEXT,
        unit_of_measure  VARCHAR(50),
        execution_date   DATE,
        quantity         DECIMAL(10,2) NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule_type
        ON schedule_executions (schedule_id, exec_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_executions`);
  }
}
