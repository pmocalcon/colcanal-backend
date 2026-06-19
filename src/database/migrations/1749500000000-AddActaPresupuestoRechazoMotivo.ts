import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Motivo de rechazo del presupuesto del acta (lo escribe la Directora Financiera
 * al rechazar). Columna aditiva y nullable.
 *
 * ⚠️ Producción corre con synchronize:true → ejecutar esta migración ANTES de
 * arrancar el backend nuevo.
 */
export class AddActaPresupuestoRechazoMotivo1749500000000
  implements MigrationInterface
{
  name = 'AddActaPresupuestoRechazoMotivo1749500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_actas
      ADD COLUMN IF NOT EXISTS presupuesto_rechazo_motivo text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_actas
      DROP COLUMN IF EXISTS presupuesto_rechazo_motivo
    `);
  }
}
