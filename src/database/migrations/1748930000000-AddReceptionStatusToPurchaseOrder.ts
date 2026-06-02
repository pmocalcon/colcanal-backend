import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReceptionStatusToPurchaseOrder1748930000000
  implements MigrationInterface
{
  name = "AddReceptionStatusToPurchaseOrder1748930000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS reception_status VARCHAR(50) NOT NULL DEFAULT 'pendiente_recepcion'
    `);

    // Backfill: marcar en_recepcion si la OC tiene algún material recibido
    await queryRunner.query(`
      UPDATE purchase_orders po
      SET reception_status = 'en_recepcion'
      WHERE EXISTS (
        SELECT 1 FROM material_receipts mr
        JOIN purchase_order_items poi ON mr.po_item_id = poi.po_item_id
        WHERE poi.purchase_order_id = po.purchase_order_id
      )
    `);

    // Backfill: marcar recepcion_completa si todos los ítems de la OC están completamente recibidos
    await queryRunner.query(`
      UPDATE purchase_orders po
      SET reception_status = 'recepcion_completa'
      WHERE po.purchase_order_id IN (
        SELECT DISTINCT poi.purchase_order_id
        FROM purchase_order_items poi
        WHERE NOT EXISTS (
          SELECT 1
          FROM purchase_order_items poi2
          WHERE poi2.purchase_order_id = poi.purchase_order_id
          AND poi2.quantity > (
            SELECT COALESCE(SUM(mr.quantity_received), 0)
            FROM material_receipts mr
            WHERE mr.po_item_id = poi2.po_item_id
          )
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_orders DROP COLUMN IF EXISTS reception_status
    `);
  }
}
