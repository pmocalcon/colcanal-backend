import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enlaza el Presupuesto del Director con el acta que lo originó.
 *
 * Hasta ahora el vínculo era solo de navegación (?acta= en la URL) y, en modo
 * agrupado, el número quedaba en `work_name` como texto suelto. Como el número de
 * acta se repite entre municipios, hacía falta la identidad completa
 * (empresa, proyecto, número) para poder cerrar el `presupuesto_status` del acta
 * cuando Gerencia aprueba el presupuesto.
 *
 * ⚠️ Producción corre con synchronize:true → ejecutar esta migración ANTES de
 * arrancar el backend nuevo. Las tres columnas son NULL, así que no requieren
 * backfill: los presupuestos viejos se resuelven por `work_id` o por el número de
 * acta cuando no hay ambigüedad.
 */
export class AddActaLinkToDirectorBudgets1751480000000 implements MigrationInterface {
  name = 'AddActaLinkToDirectorBudgets1751480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE director_budgets
      ADD COLUMN IF NOT EXISTS acta_company_id int,
      ADD COLUMN IF NOT EXISTS acta_project_id int,
      ADD COLUMN IF NOT EXISTS acta_number varchar(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE director_budgets
      DROP COLUMN IF EXISTS acta_company_id,
      DROP COLUMN IF EXISTS acta_project_id,
      DROP COLUMN IF EXISTS acta_number
    `);
  }
}
