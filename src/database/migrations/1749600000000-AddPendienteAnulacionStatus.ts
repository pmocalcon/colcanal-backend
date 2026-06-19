import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Estado intermedio: cuando el rol Compras solicita anular una requisición,
 * queda en 'pendiente_anulacion' hasta que la Directora Financiera la apruebe
 * (→ anulada) o la rechace (→ vuelve a su estado anterior).
 *
 * ⚠️ Producción corre con synchronize:true → ejecutar esta migración ANTES de
 * arrancar el backend nuevo.
 */
export class AddPendienteAnulacionStatus1749600000000
  implements MigrationInterface
{
  name = "AddPendienteAnulacionStatus1749600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO requisition_statuses (code, name, description, color, "order")
      VALUES (
        'pendiente_anulacion',
        'Pendiente de anulación',
        'Solicitud de anulación pendiente de aprobación de la Directora Financiera',
        'orange',
        98
      )
      ON CONFLICT (code) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM requisition_statuses WHERE code = 'pendiente_anulacion'
    `);
  }
}
