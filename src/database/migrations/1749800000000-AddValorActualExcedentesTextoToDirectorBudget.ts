import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Texto adicional editable para el rótulo "Valor Actual de Excedentes"
 * en el Presupuesto del Director. Columna aditiva y nullable.
 */
export class AddValorActualExcedentesTextoToDirectorBudget1749800000000
  implements MigrationInterface
{
  name = 'AddValorActualExcedentesTextoToDirectorBudget1749800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE director_budgets
      ADD COLUMN IF NOT EXISTS valor_actual_excedentes_texto varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE director_budgets
      DROP COLUMN IF EXISTS valor_actual_excedentes_texto
    `);
  }
}
