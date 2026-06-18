import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Estado de presupuesto del acta (eje financiero). El Director Técnico "envía a
 * presupuesto" → 'en_revision', y la Directora Financiera aprueba/rechaza.
 *
 * ⚠️ Producción corre con synchronize:true → ejecutar esta migración ANTES de
 * arrancar el backend nuevo (la columna tiene DEFAULT, así que backfillea sola).
 */
export class AddActaPresupuestoStatus1749300000000 implements MigrationInterface {
  name = 'AddActaPresupuestoStatus1749300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_actas
      ADD COLUMN IF NOT EXISTS presupuesto_status varchar(20) NOT NULL DEFAULT 'pendiente'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_actas
      DROP COLUMN IF EXISTS presupuesto_status
    `);
  }
}
