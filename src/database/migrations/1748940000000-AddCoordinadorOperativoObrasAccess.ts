import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoordinadorOperativoObrasAccess1748940000000 implements MigrationInterface {
  name = 'AddCoordinadorOperativoObrasAccess1748940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Resincronizar la secuencia del id por si hubo inserciones manuales
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('roles_permisos', 'id'),
        COALESCE((SELECT MAX(id) FROM roles_permisos), 1),
        true
      )
    `);

    // 1. Dar acceso al módulo "Levantamiento de Obras" a Coordinador Operativo
    await queryRunner.query(`
      INSERT INTO roles_gestiones (rol_id, gestion_id)
      SELECT r.rol_id, g.gestion_id
      FROM roles r
      CROSS JOIN gestiones g
      WHERE r.nombre_rol = 'Coordinador Operativo'
        AND g.slug = 'levantamiento-obras'
      ON CONFLICT (rol_id, gestion_id) DO NOTHING
    `);

    // 2. Asignar solo el permiso "levantamientos:nueva-obra" (crear/editar obra)
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol = 'Coordinador Operativo'
        AND p.nombre_permiso = 'levantamientos:nueva-obra'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Quitar el permiso levantamientos:nueva-obra
    await queryRunner.query(`
      DELETE FROM roles_permisos
      WHERE rol_id = (SELECT rol_id FROM roles WHERE nombre_rol = 'Coordinador Operativo')
        AND permiso_id = (SELECT permiso_id FROM permisos WHERE nombre_permiso = 'levantamientos:nueva-obra')
    `);

    // Quitar acceso al módulo Obras
    await queryRunner.query(`
      DELETE FROM roles_gestiones
      WHERE rol_id = (SELECT rol_id FROM roles WHERE nombre_rol = 'Coordinador Operativo')
        AND gestion_id = (SELECT gestion_id FROM gestiones WHERE slug = 'levantamiento-obras')
    `);
  }
}
