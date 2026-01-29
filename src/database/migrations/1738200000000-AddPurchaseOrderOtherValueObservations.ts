import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseOrderOtherValueObservations1738200000000 implements MigrationInterface {
  name = 'AddPurchaseOrderOtherValueObservations1738200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna other_value para valores adicionales (aparte del IVA)
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS other_value DECIMAL(15,2) DEFAULT 0
    `);

    // Agregar columna observations para observaciones por proveedor
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS observations TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE purchase_orders DROP COLUMN IF EXISTS observations`);
    await queryRunner.query(`ALTER TABLE purchase_orders DROP COLUMN IF EXISTS other_value`);
  }
}
