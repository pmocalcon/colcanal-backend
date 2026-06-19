import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Estampilla" en el Presupuesto del Director: porcentaje (como Retenciones)
 * para presupuestado y ejecutado. Columnas aditivas y nullable.
 *
 * ⚠️ Producción corre con synchronize:true → ejecutar esta migración ANTES de
 * arrancar el backend nuevo.
 */
export class AddEstampillaToDirectorBudget1749700000000
  implements MigrationInterface
{
  name = 'AddEstampillaToDirectorBudget1749700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE director_budgets
      ADD COLUMN IF NOT EXISTS estampilla_pct numeric(5,2),
      ADD COLUMN IF NOT EXISTS estampilla_pct_ej numeric(5,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE director_budgets
      DROP COLUMN IF EXISTS estampilla_pct,
      DROP COLUMN IF EXISTS estampilla_pct_ej
    `);
  }
}
