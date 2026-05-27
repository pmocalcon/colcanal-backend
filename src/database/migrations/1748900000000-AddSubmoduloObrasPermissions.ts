import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubmoduloObrasPermissions1748900000000 implements MigrationInterface {
  name = 'AddSubmoduloObrasPermissions1748900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear permisos específicos por sub-módulo
    await queryRunner.query(`
      INSERT INTO permisos (nombre_permiso, descripcion)
      VALUES
        ('levantamientos:obras',      'Acceder al listado de obras'),
        ('levantamientos:presupuesto','Acceder al módulo de Presupuesto'),
        ('levantamientos:plan-anual', 'Acceder al Plan Anual'),
        ('levantamientos:cronograma', 'Acceder al Cronograma')
      ON CONFLICT (nombre_permiso) DO NOTHING
    `);

    // 2. Asignar a los mismos roles que tienen levantamientos:ver
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol IN (
        'Analista PMO',
        'Director Técnico',
        'Director de Proyecto',
        'Gerencia de Proyectos',
        'Super Admin'
      )
      AND p.nombre_permiso IN (
        'levantamientos:obras',
        'levantamientos:presupuesto',
        'levantamientos:plan-anual',
        'levantamientos:cronograma'
      )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM roles_permisos
      WHERE permiso_id IN (
        SELECT permiso_id FROM permisos
        WHERE nombre_permiso IN (
          'levantamientos:obras',
          'levantamientos:presupuesto',
          'levantamientos:plan-anual',
          'levantamientos:cronograma'
        )
      )
    `);

    await queryRunner.query(`
      DELETE FROM permisos
      WHERE nombre_permiso IN (
        'levantamientos:obras',
        'levantamientos:presupuesto',
        'levantamientos:plan-anual',
        'levantamientos:cronograma'
      )
    `);
  }
}
