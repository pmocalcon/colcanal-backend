import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Concede el permiso `levantamientos:cronograma` (acceso al Cronograma) a:
 *  - Todos los roles PQRS (category 'PQRS' o nombre 'PQRS %')
 *  - Todos los Director de Proyecto regionales (category 'DIRECTOR_PROYECTO' o nombre 'Director de Proyecto %')
 *  - Gerencia (necesita la pestaña Informe)
 *  - Gerencia de Proyectos y Director Técnico (reafirmación idempotente; ya lo tenían para Operativo)
 *  - Analista PMO y Director PMO (usuarios maestros del PMO; Analista PMO ya lo tenía)
 *
 * El gating por pestaña (Plan/Ejecución/Informe/Operativo) y editar-vs-ver se resuelve en el frontend
 * (CronogramaPage) según el rol. Este permiso solo controla el acceso a la sección.
 */
export class GrantCronogramaAccessToPqrsAndGerencia1748980000000
  implements MigrationInterface
{
  name = 'GrantCronogramaAccessToPqrsAndGerencia1748980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Asegura la secuencia del id de roles_permisos antes de insertar
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('roles_permisos', 'id'),
        COALESCE((SELECT MAX(id) FROM roles_permisos), 1),
        true
      )
    `);

    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE p.nombre_permiso = 'levantamientos:cronograma'
        AND (
          r.category = 'PQRS' OR r.nombre_rol LIKE 'PQRS%'
          OR r.category = 'DIRECTOR_PROYECTO' OR r.nombre_rol LIKE 'Director de Proyecto%'
          OR r.nombre_rol IN ('Gerencia', 'Gerencia de Proyectos', 'Director Técnico', 'Analista PMO', 'Director PMO')
        )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revoca solo de los roles que claramente no tenían el permiso antes (PQRS y Gerencia).
    // No se toca Director de Proyecto / Gerencia de Proyectos / Director Técnico para no
    // revocar accesos preexistentes.
    await queryRunner.query(`
      DELETE FROM roles_permisos
      WHERE permiso_id = (
        SELECT permiso_id FROM permisos WHERE nombre_permiso = 'levantamientos:cronograma'
      )
      AND rol_id IN (
        SELECT rol_id FROM roles
        WHERE category = 'PQRS' OR nombre_rol LIKE 'PQRS%' OR nombre_rol = 'Gerencia'
      )
    `);
  }
}
