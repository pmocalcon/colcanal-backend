import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgTrgm1733300000000 implements MigrationInterface {
  name = 'EnablePgTrgm1733300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Habilitar extensión pg_trgm para fuzzy matching
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Crear índices para búsqueda por similitud
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_groups_name_trgm
      ON material_groups USING gin (name gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_description_trgm
      ON materials USING gin (description gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_code_trgm
      ON materials USING gin (code gin_trgm_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_materials_code_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_materials_description_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_material_groups_name_trgm`);
    // No eliminamos la extensión porque puede ser usada por otros
  }
}
