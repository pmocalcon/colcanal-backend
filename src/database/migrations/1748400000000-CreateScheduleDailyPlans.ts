import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScheduleDailyPlans1748400000000 implements MigrationInterface {
  name = 'CreateScheduleDailyPlans1748400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schedule_daily_plans (
        plan_id       SERIAL PRIMARY KEY,
        schedule_id   INTEGER NOT NULL REFERENCES schedules(schedule_id) ON DELETE CASCADE,
        ucap_id       INTEGER NOT NULL REFERENCES ucaps(ucap_id),
        plan_date     DATE    NOT NULL,
        planned_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        UNIQUE (schedule_id, ucap_id, plan_date)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_daily_plans`);
  }
}
