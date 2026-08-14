import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Abre el modulo CREG a los demas Directores de Proyecto.
 *
 * Hasta ahora el unico que entraba era el de Putumayo (rol 11, Carlos
 * Chamorro); los de Antioquia (8), Quindio (9) y Valle (10) quedaron fuera
 * cuando ScopeCregPermissions1751370000000 cerro el modulo. Cada uno responde
 * por la liquidacion de sus municipios, asi que se les da el mismo alcance que
 * ya tiene el 11: la entrada al modulo y sus seis sub-modulos.
 *
 * `creg:parametros` NO entra a proposito. Ahi viven el WACC, los FAOM y las
 * vidas utiles, que son las constantes con que se liquida el contrato entero;
 * siguen siendo del Director Tecnico y del PMO, igual que para el rol 11.
 *
 * Lo que el Director de Proyecto tampoco puede hacer no depende de esto sino
 * del rol: mover el IPP(m-1), reabrir una hoja de costos y cerrar un mes son
 * del Director Tecnico, y asi se quedan.
 */
export class GrantCregToDirectoresProyecto1751500000000
  implements MigrationInterface
{
  name = 'GrantCregToDirectoresProyecto1751500000000';

  /** Antioquia, Quindio y Valle. El 11 (Putumayo) ya los tenia. */
  private static readonly ROLES = [8, 9, 10];

  /** Los mismos que tiene el rol 11 hoy: todo CREG menos Parametros. */
  private static readonly PERMISOS = [
    'creg:unidades',
    'creg:resumen',
    'creg:censo',
    'creg:liquidacion',
    'creg:iddoff',
    'creg:iddon',
  ];

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
    const gestion = await queryRunner.query(
      `SELECT gestion_id FROM gestiones WHERE slug = 'creg'`,
    );
    if (gestion.length === 0) {
      throw new Error('No existe la gestion con slug "creg"');
    }
    const gestionId: number = gestion[0].gestion_id;

    await this.resyncSequence(queryRunner, 'roles_gestiones', 'id');
    await this.resyncSequence(queryRunner, 'roles_permisos', 'id');

    // Sin la gestion el modulo no aparece en el menu, aunque tenga los permisos.
    // Los casts evitan el 42P08: sin ellos Postgres deduce `text` para $1.
    for (const rolId of GrantCregToDirectoresProyecto1751500000000.ROLES) {
      await queryRunner.query(
        `INSERT INTO roles_gestiones (rol_id, gestion_id)
         SELECT CAST($1 AS int), CAST($2 AS int)
         WHERE NOT EXISTS (
           SELECT 1 FROM roles_gestiones
           WHERE rol_id = CAST($1 AS int) AND gestion_id = CAST($2 AS int)
         )`,
        [rolId, gestionId],
      );

      // Idempotente: si el rol ya lo tiene, no hace nada.
      for (const permiso of GrantCregToDirectoresProyecto1751500000000.PERMISOS) {
        await queryRunner.query(
          `INSERT INTO roles_permisos (rol_id, permiso_id)
           SELECT CAST($1 AS int), p.permiso_id
           FROM permisos p
           WHERE p.nombre_permiso = CAST($2 AS varchar)
             AND NOT EXISTS (
               SELECT 1 FROM roles_permisos rp
               WHERE rp.rol_id = CAST($1 AS int) AND rp.permiso_id = p.permiso_id
             )`,
          [rolId, permiso],
        );
      }
    }
  }

  /** Deja a los tres roles como estaban; el 11 conserva lo suyo. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM roles_permisos
       WHERE rol_id = ANY($1::int[])
         AND permiso_id IN (
           SELECT permiso_id FROM permisos
           WHERE nombre_permiso::text = ANY($2::text[])
         )`,
      [
        GrantCregToDirectoresProyecto1751500000000.ROLES,
        GrantCregToDirectoresProyecto1751500000000.PERMISOS,
      ],
    );
    await queryRunner.query(
      `DELETE FROM roles_gestiones
       WHERE rol_id = ANY($1::int[])
         AND gestion_id IN (SELECT gestion_id FROM gestiones WHERE slug = 'creg')`,
      [GrantCregToDirectoresProyecto1751500000000.ROLES],
    );
  }
}
