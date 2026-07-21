import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El Censo fisico estaba restringido al Analista PMO (rol 12), mientras que los
 * demas sub-modulos de CREG ya los veian tambien el Director Tecnico (6) y el
 * Director de Proyecto Putumayo (11). Se les abre el Censo para que CREG quede
 * parejo para los tres.
 *
 * El permiso `creg:censo` ya existe (ScopeCregPermissions1751370000000): aqui
 * solo se agregan las asignaciones que faltan.
 */
export class GrantCregCensoToDirectores1751420000000
  implements MigrationInterface
{
  name = 'GrantCregCensoToDirectores1751420000000';

  private static readonly PERMISO = 'creg:censo';

  /** Roles que ya tienen el resto de CREG pero no el Censo. */
  private static readonly ROLES = [6, 11];

  /**
   * Las filas historicas se insertaron con id explicito, asi que la secuencia
   * quedo atras y el proximo INSERT chocaria con la PK (23505).
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
    await this.resyncSequence(queryRunner, 'roles_permisos', 'id');

    // Idempotente: si el rol ya lo tiene, no hace nada.
    // Los casts evitan el 42P08: sin ellos Postgres deduce `text` para $1.
    for (const rolId of GrantCregCensoToDirectores1751420000000.ROLES) {
      await queryRunner.query(
        `INSERT INTO roles_permisos (rol_id, permiso_id)
         SELECT CAST($1 AS int), p.permiso_id
         FROM permisos p
         WHERE p.nombre_permiso = CAST($2 AS varchar)
           AND NOT EXISTS (
             SELECT 1 FROM roles_permisos rp
             WHERE rp.rol_id = CAST($1 AS int) AND rp.permiso_id = p.permiso_id
           )`,
        [rolId, GrantCregCensoToDirectores1751420000000.PERMISO],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Solo revierte los roles que agrego esta migracion: el 12 conserva el suyo.
    await queryRunner.query(
      `DELETE FROM roles_permisos
       WHERE rol_id = ANY($1::int[])
         AND permiso_id IN (
           SELECT permiso_id FROM permisos WHERE nombre_permiso = CAST($2 AS varchar)
         )`,
      [
        GrantCregCensoToDirectores1751420000000.ROLES,
        GrantCregCensoToDirectores1751420000000.PERMISO,
      ],
    );
  }
}
