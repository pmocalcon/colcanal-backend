import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestrictLevantamientosToDirectorProyecto1748700000000 implements MigrationInterface {
  name = 'RestrictLevantamientosToDirectorProyecto1748700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Quitar todos los permisos de levantamientos a PQRS y Coordinador Operativo
    await queryRunner.query(`
      DELETE FROM roles_permisos
      WHERE permiso_id IN (
        SELECT permiso_id FROM permisos WHERE nombre_permiso LIKE 'levantamientos:%'
      )
      AND rol_id IN (
        SELECT rol_id FROM roles
        WHERE nombre_rol IN ('PQRS', 'Coordinador Operativo')
      )
    `);

    // 2. "Director de Proyecto": solo ver
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol = 'Director de Proyecto'
        AND p.nombre_permiso = 'levantamientos:ver'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);

    // 3. "Director Técnico": todos los permisos
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol = 'Director Técnico'
        AND p.nombre_permiso IN (
          'levantamientos:ver',
          'levantamientos:crear',
          'levantamientos:editar',
          'levantamientos:eliminar',
          'levantamientos:revisar',
          'levantamientos:aprobar',
          'levantamientos:reabrir'
        )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);

    // 4. "Analista PMO" (superusuario): todos los permisos
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol = 'Analista PMO'
        AND p.nombre_permiso IN (
          'levantamientos:ver',
          'levantamientos:crear',
          'levantamientos:editar',
          'levantamientos:eliminar',
          'levantamientos:revisar',
          'levantamientos:aprobar',
          'levantamientos:reabrir'
        )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);

    // 5. "Gerencia de Proyectos": solo ver
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol = 'Gerencia de Proyectos'
        AND p.nombre_permiso = 'levantamientos:ver'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Quitar los permisos que se agregaron a Gerencia de Proyectos
    await queryRunner.query(`
      DELETE FROM roles_permisos
      WHERE permiso_id IN (
        SELECT permiso_id FROM permisos WHERE nombre_permiso LIKE 'levantamientos:%'
      )
      AND rol_id = (SELECT rol_id FROM roles WHERE nombre_rol = 'Gerencia de Proyectos')
    `);

    // Restaurar PQRS y Coordinador Operativo
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol IN ('PQRS', 'Coordinador Operativo')
        AND p.nombre_permiso IN (
          'levantamientos:ver',
          'levantamientos:crear',
          'levantamientos:editar',
          'levantamientos:eliminar'
        )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);

    // Quitar permisos de Director de Proyecto (sólo tenía 'ver' en este estado)
    await queryRunner.query(`
      DELETE FROM roles_permisos
      WHERE permiso_id IN (
        SELECT permiso_id FROM permisos WHERE nombre_permiso LIKE 'levantamientos:%'
      )
      AND rol_id = (SELECT rol_id FROM roles WHERE nombre_rol = 'Director de Proyecto')
    `);
  }
}
