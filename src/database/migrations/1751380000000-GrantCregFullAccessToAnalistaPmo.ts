import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El Analista PMO (rol 12) pasa a tener acceso completo al modulo CREG.
 * Antes solo tenia `creg:censo` (ver ScopeCregPermissions1751370000000).
 */
export class GrantCregFullAccessToAnalistaPmo1751380000000
  implements MigrationInterface
{
  name = 'GrantCregFullAccessToAnalistaPmo1751380000000';

  private static readonly ROL_ANALISTA_PMO = 12;

  /** Los que le faltaban; `creg:censo` ya lo tenia. */
  private static readonly PERMISOS = [
    'creg:unidades',
    'creg:resumen',
    'creg:parametros',
    'creg:censo',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rolId = GrantCregFullAccessToAnalistaPmo1751380000000.ROL_ANALISTA_PMO;

    // Las filas historicas se insertaron con id explicito: la secuencia va atras.
    await queryRunner.query(
      `SELECT setval(
         pg_get_serial_sequence('roles_permisos', 'id'),
         (SELECT COALESCE(MAX(id), 1) FROM roles_permisos)
       )`,
    );

    for (const nombre of GrantCregFullAccessToAnalistaPmo1751380000000.PERMISOS) {
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

  /** Vuelve a dejarle solo `creg:censo`. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM roles_permisos
       WHERE rol_id = CAST($1 AS int)
         AND permiso_id IN (
           SELECT permiso_id FROM permisos
           WHERE nombre_permiso::text = ANY($2::text[])
         )`,
      [
        GrantCregFullAccessToAnalistaPmo1751380000000.ROL_ANALISTA_PMO,
        ['creg:unidades', 'creg:resumen', 'creg:parametros'],
      ],
    );
  }
}
