import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnualPlanReviews1751360000000 implements MigrationInterface {
  name = 'CreateAnnualPlanReviews1751360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS annual_plan_reviews (
        review_id   SERIAL PRIMARY KEY,
        year        INT NOT NULL,
        municipio   VARCHAR(150) NOT NULL,
        zone        VARCHAR(80) NOT NULL DEFAULT 'all',
        status      VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        comment     TEXT,
        reviewed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_annual_plan_reviews_scope UNIQUE (year, municipio, zone)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_annual_plan_reviews_year_municipio
      ON annual_plan_reviews(year, municipio);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_annual_plan_reviews_year_municipio;`);
    await queryRunner.query(`DROP TABLE IF EXISTS annual_plan_reviews;`);
  }
}
