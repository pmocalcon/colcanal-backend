import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActaSummaryDrafts1751350000000 implements MigrationInterface {
  name = 'CreateActaSummaryDrafts1751350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS acta_summary_drafts (
        summary_id  SERIAL PRIMARY KEY,
        company_id  INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        acta_number VARCHAR(100) NOT NULL,
        payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by  INT REFERENCES users(user_id) ON DELETE SET NULL,
        updated_by  INT REFERENCES users(user_id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_acta_summary_drafts_company_acta UNIQUE (company_id, acta_number)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_acta_summary_drafts_company
      ON acta_summary_drafts(company_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_acta_summary_drafts_company;`);
    await queryRunner.query(`DROP TABLE IF EXISTS acta_summary_drafts;`);
  }
}
