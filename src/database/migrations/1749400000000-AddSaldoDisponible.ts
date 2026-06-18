import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Saldo disponible para obras" en el Presupuesto del Director: campo manual
 * junto a los excedentes. Columna aditiva y nullable.
 *
 * ⚠️ Producción corre con synchronize:true → ejecutar esta migración ANTES de
 * arrancar el backend nuevo.
 */
export class AddSaldoDisponible1749400000000 implements MigrationInterface {
  name = 'AddSaldoDisponible1749400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE director_budgets
      ADD COLUMN IF NOT EXISTS saldo_disponible numeric(15,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE director_budgets
      DROP COLUMN IF EXISTS saldo_disponible
    `);
  }
}
