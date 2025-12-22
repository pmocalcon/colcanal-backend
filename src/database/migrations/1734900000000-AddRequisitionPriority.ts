import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequisitionPriority1734900000000 implements MigrationInterface {
  name = 'AddRequisitionPriority1734900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna priority con valor por defecto 'normal'
    await queryRunner.query(`
      ALTER TABLE requisitions
      ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'normal' NOT NULL
    `);

    // Crear índice para optimizar ordenamiento por prioridad
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_requisitions_priority
      ON requisitions(priority)
    `);

    // Crear índice compuesto para queries comunes (status + priority + created_at)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_requisitions_status_priority_created
      ON requisitions(status_id, priority, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_requisitions_status_priority_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_requisitions_priority`);
    await queryRunner.query(`ALTER TABLE requisitions DROP COLUMN IF EXISTS priority`);
  }
}
