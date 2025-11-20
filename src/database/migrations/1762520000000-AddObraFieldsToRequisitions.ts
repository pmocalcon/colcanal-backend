import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddObraFieldsToRequisitions1762520000000
  implements MigrationInterface
{
  name = 'AddObraFieldsToRequisitions1762520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columnas 'obra' y 'codigo_obra' a tabla requisitions
    await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD COLUMN "obra" character varying(100),
      ADD COLUMN "codigo_obra" character varying(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar columnas 'obra' y 'codigo_obra'
    await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP COLUMN "codigo_obra",
      DROP COLUMN "obra"
    `);
  }
}
