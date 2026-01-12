import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSurveyReviewerAccess1736300000000 implements MigrationInterface {
  name = 'AddSurveyReviewerAccess1736300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla de acceso para revisores de encuestas
    await queryRunner.query(`
      CREATE TABLE survey_reviewer_access (
        access_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
        project_id INT REFERENCES projects(project_id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),

        -- Solo puede tener company_id O project_id, no ambos
        CONSTRAINT check_company_or_project CHECK (
          (company_id IS NOT NULL AND project_id IS NULL) OR
          (company_id IS NULL AND project_id IS NOT NULL)
        )
      );
    `);

    // Índices para búsquedas rápidas
    await queryRunner.query(`
      CREATE INDEX idx_survey_reviewer_access_user ON survey_reviewer_access(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_survey_reviewer_access_company ON survey_reviewer_access(company_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_survey_reviewer_access_project ON survey_reviewer_access(project_id);
    `);

    // Índice único para evitar duplicados
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_survey_reviewer_access_unique
      ON survey_reviewer_access(user_id, COALESCE(company_id, 0), COALESCE(project_id, 0));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS survey_reviewer_access;`);
  }
}
