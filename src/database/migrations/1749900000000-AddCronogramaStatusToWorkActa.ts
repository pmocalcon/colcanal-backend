import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Estado del plan del cronograma del acta: el Director de Proyecto envía a revisión
 * y el Director Técnico aprueba (habilita ejecución) o rechaza con motivo.
 * Columnas aditivas y nullable / con default.
 *
 * ⚠️ Producción corre con synchronize:true → ejecutar esta migración ANTES de
 * arrancar el backend nuevo.
 */
export class AddCronogramaStatusToWorkActa1749900000000
  implements MigrationInterface
{
  name = 'AddCronogramaStatusToWorkActa1749900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_actas
      ADD COLUMN IF NOT EXISTS cronograma_status varchar(20) NOT NULL DEFAULT 'pendiente',
      ADD COLUMN IF NOT EXISTS cronograma_rechazo_motivo text,
      ADD COLUMN IF NOT EXISTS cronograma_reviewed_by int,
      ADD COLUMN IF NOT EXISTS cronograma_reviewed_at timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_actas
      DROP COLUMN IF EXISTS cronograma_status,
      DROP COLUMN IF EXISTS cronograma_rechazo_motivo,
      DROP COLUMN IF EXISTS cronograma_reviewed_by,
      DROP COLUMN IF EXISTS cronograma_reviewed_at
    `);
  }
}
