import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El campo survey_travel_expenses.expense_type era un enum nativo de Postgres con
 * solo los 8 tipos fijos, por lo que las líneas personalizadas ("Agregar línea" en
 * Costos de Viaje) se rechazaban al guardar. Se convierte a varchar para admitir
 * tanto los tipos fijos como descripciones libres.
 *
 * ⚠️ Producción corre con synchronize:true → esta migración debe ejecutarse ANTES de
 * arrancar el backend nuevo (data-source aislado), para que el esquema ya sea varchar
 * y synchronize no intente convertir el enum por su cuenta.
 */
export class ConvertTravelExpenseTypeToVarchar1749200000000 implements MigrationInterface {
  name = 'ConvertTravelExpenseTypeToVarchar1749200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE survey_travel_expenses
      ALTER COLUMN expense_type TYPE varchar(150)
      USING expense_type::text
    `);
    // El tipo enum queda huérfano tras el cambio de columna; se elimina si existe.
    await queryRunner.query(`
      DROP TYPE IF EXISTS survey_travel_expenses_expense_type_enum
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE survey_travel_expenses_expense_type_enum AS ENUM
      ('tolls','parking','lodging','food','fuel','additional_crew','day_hours','holiday_overtime')
    `);
    // Solo revierte si NO hay descripciones personalizadas (valores fuera del enum fallarían).
    await queryRunner.query(`
      ALTER TABLE survey_travel_expenses
      ALTER COLUMN expense_type TYPE survey_travel_expenses_expense_type_enum
      USING expense_type::survey_travel_expenses_expense_type_enum
    `);
  }
}
