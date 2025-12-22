import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEmailNotificacion1734900001000 implements MigrationInterface {
  name = 'AddUserEmailNotificacion1734900001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna email_notificacion para correos de notificación
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_notificacion VARCHAR(120) NULL
    `);

    // Crear índice para búsquedas por email de notificación
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_notificacion
      ON users(email_notificacion)
      WHERE email_notificacion IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_email_notificacion`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS email_notificacion`);
  }
}
