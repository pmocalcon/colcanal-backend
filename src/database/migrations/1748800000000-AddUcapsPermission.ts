import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUcapsPermission1748800000000 implements MigrationInterface {
  name = 'AddUcapsPermission1748800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear permiso específico para UCAPs
    await queryRunner.query(`
      INSERT INTO permisos (nombre_permiso, descripcion)
      VALUES ('levantamientos:ucaps', 'Acceder al módulo de UCAPs')
      ON CONFLICT (nombre_permiso) DO NOTHING
    `);

    // 2. Asignar a Analista PMO
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol = 'Analista PMO'
        AND p.nombre_permiso = 'levantamientos:ucaps'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);

    // 3. Asignar a Director Técnico
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol = 'Director Técnico'
        AND p.nombre_permiso = 'levantamientos:ucaps'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);

    // 4. Asignar a Super Admin
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol = 'Super Admin'
        AND p.nombre_permiso = 'levantamientos:ucaps'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM roles_permisos
      WHERE permiso_id = (
        SELECT permiso_id FROM permisos WHERE nombre_permiso = 'levantamientos:ucaps'
      )
    `);

    await queryRunner.query(`
      DELETE FROM permisos WHERE nombre_permiso = 'levantamientos:ucaps'
    `);
  }
}
