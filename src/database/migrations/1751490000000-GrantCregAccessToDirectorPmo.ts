import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El Director PMO queda con el mismo alcance que el Analista PMO en CREG.
 *
 * En vez de enumerar los sub-modulos —la lista ya cambio cuatro veces: censo,
 * liquidacion, ID OFF, ID ON— se copia lo que hoy tenga el Analista PMO. Asi la
 * regla queda escrita como el usuario la enuncio ("los mismos permisos") y no
 * como una foto que hay que volver a tocar con el proximo sub-modulo.
 *
 * Son dos cosas distintas:
 *  - los permisos `creg:*` (unidades, resumen, parametros, censo, liquidacion,
 *    iddoff, iddon), que son filas con nombre propio en `permisos`; y
 *  - la entrada al modulo, que NO es un permiso guardado: `creg:ver` lo deriva
 *    `AuthService.buildPermissions` cruzando la gestion `creg` en
 *    `roles_gestiones` con el permiso generico "Ver" (permiso_id 1). Sin ambos,
 *    la tarjeta sale con candado y la ruta /dashboard/creg queda cerrada.
 *
 * Gestion del Conocimiento no aparece aca: su tarjeta esta fija en el frontend
 * y no pasa por `gestiones`, asi que ya era visible para todos los roles.
 */
export class GrantCregAccessToDirectorPmo1751490000000
  implements MigrationInterface
{
  name = 'GrantCregAccessToDirectorPmo1751490000000';

  /** Rol que recibe el acceso. */
  private static readonly ROL_DESTINO = 'Director PMO';
  /** Rol que sirve de molde. */
  private static readonly ROL_MODELO = 'Analista PMO';
  /** Permiso generico "Ver" (ver PERMISO_IDS en auth.service.ts). */
  private static readonly PERMISO_VER = 1;

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

  private async rolId(
    queryRunner: QueryRunner,
    nombreRol: string,
  ): Promise<number> {
    const filas = await queryRunner.query(
      `SELECT rol_id FROM roles WHERE nombre_rol = CAST($1 AS varchar)`,
      [nombreRol],
    );
    if (filas.length === 0) {
      throw new Error(`No existe el rol "${nombreRol}"`);
    }
    return filas[0].rol_id;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const destino = await this.rolId(
      queryRunner,
      GrantCregAccessToDirectorPmo1751490000000.ROL_DESTINO,
    );
    const modelo = await this.rolId(
      queryRunner,
      GrantCregAccessToDirectorPmo1751490000000.ROL_MODELO,
    );

    const gestion = await queryRunner.query(
      `SELECT gestion_id FROM gestiones WHERE slug = 'creg'`,
    );
    if (gestion.length === 0) {
      throw new Error('No existe la gestion con slug "creg"');
    }
    const gestionId: number = gestion[0].gestion_id;

    await this.resyncSequence(queryRunner, 'roles_gestiones', 'id');
    await this.resyncSequence(queryRunner, 'roles_permisos', 'id');

    // 1. Entrada al modulo.
    await queryRunner.query(
      `INSERT INTO roles_gestiones (rol_id, gestion_id)
       SELECT CAST($1 AS int), CAST($2 AS int)
       WHERE NOT EXISTS (
         SELECT 1 FROM roles_gestiones
         WHERE rol_id = CAST($1 AS int) AND gestion_id = CAST($2 AS int)
       )`,
      [destino, gestionId],
    );

    // 2. El generico "Ver", que es la otra mitad de `creg:ver`. Casi seguro ya
    //    lo tiene —lo necesita para cualquier modulo—, por eso el down no lo
    //    devuelve: quitarlo le cerraria todo lo demas.
    await queryRunner.query(
      `INSERT INTO roles_permisos (rol_id, permiso_id)
       SELECT CAST($1 AS int), CAST($2 AS int)
       WHERE NOT EXISTS (
         SELECT 1 FROM roles_permisos
         WHERE rol_id = CAST($1 AS int) AND permiso_id = CAST($2 AS int)
       )`,
      [destino, GrantCregAccessToDirectorPmo1751490000000.PERMISO_VER],
    );

    // 3. Los sub-modulos, copiados del molde.
    await queryRunner.query(
      `INSERT INTO roles_permisos (rol_id, permiso_id)
       SELECT CAST($1 AS int), p.permiso_id
       FROM permisos p
       INNER JOIN roles_permisos modelo
         ON modelo.permiso_id = p.permiso_id
        AND modelo.rol_id = CAST($2 AS int)
       WHERE p.nombre_permiso LIKE 'creg:%'
         AND NOT EXISTS (
           SELECT 1 FROM roles_permisos rp
           WHERE rp.rol_id = CAST($1 AS int) AND rp.permiso_id = p.permiso_id
         )`,
      [destino, modelo],
    );
  }

  /** Le quita CREG al Director PMO y lo deja como estaba. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const destino = await this.rolId(
      queryRunner,
      GrantCregAccessToDirectorPmo1751490000000.ROL_DESTINO,
    );

    await queryRunner.query(
      `DELETE FROM roles_permisos
       WHERE rol_id = CAST($1 AS int)
         AND permiso_id IN (
           SELECT permiso_id FROM permisos WHERE nombre_permiso LIKE 'creg:%'
         )`,
      [destino],
    );
    await queryRunner.query(
      `DELETE FROM roles_gestiones
       WHERE rol_id = CAST($1 AS int)
         AND gestion_id IN (SELECT gestion_id FROM gestiones WHERE slug = 'creg')`,
      [destino],
    );
  }
}
