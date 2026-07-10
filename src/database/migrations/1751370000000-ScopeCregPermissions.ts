import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Restringe el modulo CREG y define permisos por sub-modulo.
 *
 * Acceso al modulo (gestion `creg`, hoy asignada a los 36 roles):
 *   - rol 6  Director Tecnico
 *   - rol 11 Director de Proyecto Putumayo (Carlos Chamorro)
 *   - rol 12 Analista PMO (necesario para el Censo fisico)
 *
 * Sub-modulos (permisos granulares, mismo patron que `levantamientos:*`):
 *   creg:unidades   -> roles 6, 11
 *   creg:resumen    -> roles 6, 11
 *   creg:parametros -> rol 6
 *   creg:censo      -> rol 12
 */
export class ScopeCregPermissions1751370000000 implements MigrationInterface {
  name = 'ScopeCregPermissions1751370000000';

  private static readonly PERMISOS: [string, string][] = [
    ['creg:unidades', 'Acceder a las unidades constructivas (UCAP) de CREG'],
    ['creg:resumen', 'Acceder al resumen de UCAPs de CREG'],
    ['creg:parametros', 'Acceder a la hoja de parametrizacion de CREG'],
    ['creg:censo', 'Acceder al censo fisico de CREG'],
  ];

  /** Roles que conservan la gestion `creg` (entrada al modulo). */
  private static readonly ROLES_CON_MODULO = [6, 11, 12];

  /** permiso -> roles que lo reciben. */
  private static readonly GRANTS: Record<string, number[]> = {
    'creg:unidades': [6, 11],
    'creg:resumen': [6, 11],
    'creg:parametros': [6],
    'creg:censo': [12],
  };

  /**
   * Las filas historicas se insertaron con id explicito, asi que las secuencias
   * quedaron atras y el proximo INSERT chocaria con la PK. Se realinean antes.
   */
  private async resyncSequence(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<void> {
    await queryRunner.query(
      `SELECT setval(
         pg_get_serial_sequence('${table}', '${column}'),
         (SELECT COALESCE(MAX(${column}), 1) FROM ${table})
       )`,
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const gestion = await queryRunner.query(
      `SELECT gestion_id FROM gestiones WHERE slug = 'creg'`,
    );
    if (gestion.length === 0) {
      throw new Error('No existe la gestion con slug "creg"');
    }
    const gestionId: number = gestion[0].gestion_id;

    await this.resyncSequence(queryRunner, 'permisos', 'permiso_id');
    await this.resyncSequence(queryRunner, 'roles_permisos', 'id');
    await this.resyncSequence(queryRunner, 'roles_gestiones', 'id');

    // 1. Solo los roles autorizados entran al modulo CREG.
    await queryRunner.query(
      `DELETE FROM roles_gestiones
       WHERE gestion_id = $1 AND rol_id <> ALL($2::int[])`,
      [gestionId, ScopeCregPermissions1751370000000.ROLES_CON_MODULO],
    );
    for (const rolId of ScopeCregPermissions1751370000000.ROLES_CON_MODULO) {
      await queryRunner.query(
        `INSERT INTO roles_gestiones (rol_id, gestion_id)
         SELECT CAST($1 AS int), CAST($2 AS int)
         WHERE NOT EXISTS (
           SELECT 1 FROM roles_gestiones
           WHERE rol_id = CAST($1 AS int) AND gestion_id = CAST($2 AS int)
         )`,
        [rolId, gestionId],
      );
    }

    // 2. Crear los permisos de sub-modulo (idempotente por nombre).
    //    Los casts son necesarios: sin ellos Postgres deduce `text` para $1 en
    //    el SELECT y `varchar` al compararlo con la columna, y falla (42P08).
    for (const [nombre, descripcion] of ScopeCregPermissions1751370000000.PERMISOS) {
      await queryRunner.query(
        `INSERT INTO permisos (nombre_permiso, descripcion)
         SELECT CAST($1 AS varchar), CAST($2 AS varchar)
         WHERE NOT EXISTS (
           SELECT 1 FROM permisos WHERE nombre_permiso = CAST($1 AS varchar)
         )`,
        [nombre, descripcion],
      );
    }

    // 3. Asignar cada permiso a sus roles.
    for (const [nombre, roles] of Object.entries(
      ScopeCregPermissions1751370000000.GRANTS,
    )) {
      for (const rolId of roles) {
        await queryRunner.query(
          `INSERT INTO roles_permisos (rol_id, permiso_id)
           SELECT CAST($1 AS int), p.permiso_id
           FROM permisos p
           WHERE p.nombre_permiso = CAST($2 AS varchar)
             AND NOT EXISTS (
               SELECT 1 FROM roles_permisos rp
               WHERE rp.rol_id = CAST($1 AS int) AND rp.permiso_id = p.permiso_id
             )`,
          [rolId, nombre],
        );
      }
    }
  }

  /**
   * Revierte al estado anterior: la gestion `creg` para todos los roles y
   * sin permisos de sub-modulo.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const nombres = ScopeCregPermissions1751370000000.PERMISOS.map(([n]) => n);

    await queryRunner.query(
      `DELETE FROM roles_permisos
       WHERE permiso_id IN (
         SELECT permiso_id FROM permisos
         WHERE nombre_permiso::text = ANY($1::text[])
       )`,
      [nombres],
    );
    await queryRunner.query(
      `DELETE FROM permisos WHERE nombre_permiso::text = ANY($1::text[])`,
      [nombres],
    );

    await queryRunner.query(
      `INSERT INTO roles_gestiones (rol_id, gestion_id)
       SELECT r.rol_id, g.gestion_id
       FROM roles r CROSS JOIN gestiones g
       WHERE g.slug = 'creg'
         AND NOT EXISTS (
           SELECT 1 FROM roles_gestiones rg
           WHERE rg.rol_id = r.rol_id AND rg.gestion_id = g.gestion_id
         )`,
    );
  }
}
