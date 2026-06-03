import { MigrationInterface, QueryRunner } from 'typeorm';

export class GrantCoordinadorOperativoLevantamientosAccess1748950000000 implements MigrationInterface {
  name = 'GrantCoordinadorOperativoLevantamientosAccess1748950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('roles_permisos', 'id'),
        COALESCE((SELECT MAX(id) FROM roles_permisos), 1),
        true
      )
    `);

    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('roles_gestiones', 'id'),
        COALESCE((SELECT MAX(id) FROM roles_gestiones), 1),
        true
      )
    `);

    await queryRunner.query(`
      INSERT INTO roles_gestiones (rol_id, gestion_id)
      SELECT coordinador.rol_id, rg.gestion_id
      FROM roles coordinador
      CROSS JOIN roles director
      INNER JOIN roles_gestiones rg ON rg.rol_id = director.rol_id
      INNER JOIN gestiones g ON g.gestion_id = rg.gestion_id
      WHERE coordinador.nombre_rol = 'Coordinador Operativo'
        AND (director.category = 'DIRECTOR_PROYECTO' OR director.nombre_rol LIKE 'Director de Proyecto%')
        AND g.slug = 'levantamiento-obras'
      ON CONFLICT (rol_id, gestion_id) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT DISTINCT coordinador.rol_id, rp.permiso_id
      FROM roles coordinador
      CROSS JOIN roles director
      INNER JOIN roles_permisos rp ON rp.rol_id = director.rol_id
      INNER JOIN permisos p ON p.permiso_id = rp.permiso_id
      WHERE coordinador.nombre_rol = 'Coordinador Operativo'
        AND (director.category = 'DIRECTOR_PROYECTO' OR director.nombre_rol LIKE 'Director de Proyecto%')
        AND p.nombre_permiso LIKE 'levantamientos:%'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM roles_permisos
      WHERE rol_id = (SELECT rol_id FROM roles WHERE nombre_rol = 'Coordinador Operativo')
        AND permiso_id IN (
          SELECT permiso_id FROM permisos WHERE nombre_permiso LIKE 'levantamientos:%'
        )
    `);
  }
}
