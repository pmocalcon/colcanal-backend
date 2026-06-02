import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnuladaRequisitionStatus1748920000000
  implements MigrationInterface
{
  name = "AddAnuladaRequisitionStatus1748920000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO requisition_statuses (code, name, description, color, "order")
      VALUES (
        'anulada',
        'Anulada',
        'Requisición anulada por PMO',
        'gray',
        99
      )
      ON CONFLICT (code) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM requisition_statuses WHERE code = 'anulada'
    `);
  }
}
