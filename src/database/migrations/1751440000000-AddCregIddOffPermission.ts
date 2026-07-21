import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nuevo sub-modulo CREG: IDD OFF (indice de disponibilidad de las apagadas).
 *
 * Mismo alcance que el resto de CREG: 6 Director Tecnico, 11 Director de
 * Proyecto Putumayo y 12 Analista PMO.
 */
export class AddCregIddOffPermission1751440000000 implements MigrationInterface {
  name = 'AddCregIddOffPermission1751440000000';

  private static readonly PERMISO = 'creg:iddoff';
  private static readonly DESCRIPCION =
    'Acceder al indice de disponibilidad de las apagadas (IDD OFF)';

  private static readonly ROLES = [6, 11, 12];

  /**
   * Las filas historicas se insertaron con id explicito, asi que las secuencias
   * quedaron atras y el proximo INSERT chocaria con la PK (23505).
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
    await this.resyncSequence(queryRunner, 'permisos', 'permiso_id');
    await this.resyncSequence(queryRunner, 'roles_permisos', 'id');

    // Los casts evitan el 42P08: sin ellos Postgres deduce `text` para $1.
    await queryRunner.query(
      `INSERT INTO permisos (nombre_permiso, descripcion)
       SELECT CAST($1 AS varchar), CAST($2 AS varchar)
       WHERE NOT EXISTS (
         SELECT 1 FROM permisos WHERE nombre_permiso = CAST($1 AS varchar)
       )`,
      [
        AddCregIddOffPermission1751440000000.PERMISO,
        AddCregIddOffPermission1751440000000.DESCRIPCION,
      ],
    );

    for (const rolId of AddCregIddOffPermission1751440000000.ROLES) {
      await queryRunner.query(
        `INSERT INTO roles_permisos (rol_id, permiso_id)
         SELECT CAST($1 AS int), p.permiso_id
         FROM permisos p
         WHERE p.nombre_permiso = CAST($2 AS varchar)
           AND NOT EXISTS (
             SELECT 1 FROM roles_permisos rp
             WHERE rp.rol_id = CAST($1 AS int) AND rp.permiso_id = p.permiso_id
           )`,
        [rolId, AddCregIddOffPermission1751440000000.PERMISO],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM roles_permisos
       WHERE permiso_id IN (
         SELECT permiso_id FROM permisos WHERE nombre_permiso = CAST($1 AS varchar)
       )`,
      [AddCregIddOffPermission1751440000000.PERMISO],
    );
    await queryRunner.query(
      `DELETE FROM permisos WHERE nombre_permiso = CAST($1 AS varchar)`,
      [AddCregIddOffPermission1751440000000.PERMISO],
    );
  }
}
