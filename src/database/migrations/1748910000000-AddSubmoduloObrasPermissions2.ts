import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubmoduloObrasPermissions21748910000000 implements MigrationInterface {
  name = 'AddSubmoduloObrasPermissions21748910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Resincronizar la secuencia del id por si hubo inserciones manuales
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('roles_permisos', 'id'),
        COALESCE((SELECT MAX(id) FROM roles_permisos), 1),
        true
      )
    `);

    // 1. Crear permisos específicos para los sub-módulos que aún usaban permisos genéricos
    await queryRunner.query(`
      INSERT INTO permisos (nombre_permiso, descripcion)
      VALUES
        ('levantamientos:levantamientos', 'Acceder al listado de levantamientos'),
        ('levantamientos:nueva-obra',     'Acceder a crear nueva obra')
      ON CONFLICT (nombre_permiso) DO NOTHING
    `);

    // 2. levantamientos:levantamientos → mismos roles que tenían levantamientos:ver
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
      AND p.nombre_permiso = 'levantamientos:levantamientos'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);

    // 3. levantamientos:nueva-obra → solo roles que podían crear obras
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol IN (
        'Analista PMO',
        'Director de Proyecto',
        'Super Admin'
      )
      AND p.nombre_permiso = 'levantamientos:nueva-obra'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM roles_permisos
      WHERE permiso_id IN (
        SELECT permiso_id FROM permisos
        WHERE nombre_permiso IN (
          'levantamientos:levantamientos',
          'levantamientos:nueva-obra'
        )
      )
    `);

    await queryRunner.query(`
      DELETE FROM permisos
      WHERE nombre_permiso IN (
        'levantamientos:levantamientos',
        'levantamientos:nueva-obra'
      )
    `);
  }
}
