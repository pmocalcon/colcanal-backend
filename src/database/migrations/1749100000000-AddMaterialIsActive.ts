import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaterialIsActive1749100000000 implements MigrationInterface {
  name = 'AddMaterialIsActive1749100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Borrado lógico de materiales: los materiales usados en levantamientos,
    // requisiciones o presupuestos no pueden borrarse físicamente (FK). En vez
    // de eso se desactivan (is_active=false) y se ocultan del catálogo.
    await queryRunner.query(`
      ALTER TABLE materials
      ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE materials
      DROP COLUMN IF EXISTS is_active
    `);
  }
}
