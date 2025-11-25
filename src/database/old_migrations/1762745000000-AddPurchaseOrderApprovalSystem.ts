import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseOrderApprovalSystem1762745000000
  implements MigrationInterface
{
  name = 'AddPurchaseOrderApprovalSystem1762745000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types for approval status
    await queryRunner.query(`
      CREATE TYPE "purchase_order_status_enum" AS ENUM (
        'borrador',
        'pendiente_aprobacion_gerencia',
        'aprobada_gerencia',
        'rechazada_gerencia',
        'en_recepcion',
        'completada'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "po_approval_status_enum" AS ENUM (
        'pendiente',
        'aprobado',
        'rechazado'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "po_item_approval_status_enum" AS ENUM (
        'pendiente',
        'aprobado',
        'rechazado'
      )
    `);

    // Add approval fields to purchase_orders table
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
      ADD COLUMN "approval_status" "purchase_order_status_enum"
        NOT NULL DEFAULT 'pendiente_aprobacion_gerencia',
      ADD COLUMN "rejection_count" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN "last_rejection_reason" TEXT,
      ADD COLUMN "current_approver_id" INTEGER
    `);

    // Add foreign key for current_approver_id
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
      ADD CONSTRAINT "FK_purchase_orders_current_approver"
      FOREIGN KEY ("current_approver_id")
      REFERENCES "users"("user_id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    // Create purchase_order_approvals table
    await queryRunner.query(`
      CREATE TABLE "purchase_order_approvals" (
        "approval_id" SERIAL NOT NULL,
        "purchase_order_id" INTEGER NOT NULL,
        "approver_id" INTEGER NOT NULL,
        "approval_status" "po_approval_status_enum" NOT NULL DEFAULT 'pendiente',
        "comments" TEXT,
        "rejection_reason" TEXT,
        "approval_date" TIMESTAMP,
        "deadline" TIMESTAMP NOT NULL,
        "is_overdue" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_order_approvals" PRIMARY KEY ("approval_id")
      )
    `);

    // Add foreign keys for purchase_order_approvals
    await queryRunner.query(`
      ALTER TABLE "purchase_order_approvals"
      ADD CONSTRAINT "FK_purchase_order_approvals_po"
      FOREIGN KEY ("purchase_order_id")
      REFERENCES "purchase_orders"("purchase_order_id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_order_approvals"
      ADD CONSTRAINT "FK_purchase_order_approvals_approver"
      FOREIGN KEY ("approver_id")
      REFERENCES "users"("user_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    // Create purchase_order_item_approvals table
    await queryRunner.query(`
      CREATE TABLE "purchase_order_item_approvals" (
        "item_approval_id" SERIAL NOT NULL,
        "po_approval_id" INTEGER NOT NULL,
        "po_item_id" INTEGER NOT NULL,
        "approval_status" "po_item_approval_status_enum" NOT NULL DEFAULT 'pendiente',
        "comments" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_order_item_approvals" PRIMARY KEY ("item_approval_id")
      )
    `);

    // Add foreign keys for purchase_order_item_approvals
    await queryRunner.query(`
      ALTER TABLE "purchase_order_item_approvals"
      ADD CONSTRAINT "FK_po_item_approvals_approval"
      FOREIGN KEY ("po_approval_id")
      REFERENCES "purchase_order_approvals"("approval_id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_order_item_approvals"
      ADD CONSTRAINT "FK_po_item_approvals_item"
      FOREIGN KEY ("po_item_id")
      REFERENCES "purchase_order_items"("po_item_id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_po_approvals_purchase_order"
      ON "purchase_order_approvals"("purchase_order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_po_approvals_approver"
      ON "purchase_order_approvals"("approver_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_po_approvals_status"
      ON "purchase_order_approvals"("approval_status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_po_item_approvals_approval"
      ON "purchase_order_item_approvals"("po_approval_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_po_item_approvals_approval"`);
    await queryRunner.query(`DROP INDEX "IDX_po_approvals_status"`);
    await queryRunner.query(`DROP INDEX "IDX_po_approvals_approver"`);
    await queryRunner.query(`DROP INDEX "IDX_po_approvals_purchase_order"`);

    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "purchase_order_item_approvals"
      DROP CONSTRAINT "FK_po_item_approvals_item"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_order_item_approvals"
      DROP CONSTRAINT "FK_po_item_approvals_approval"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_order_approvals"
      DROP CONSTRAINT "FK_purchase_order_approvals_approver"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_order_approvals"
      DROP CONSTRAINT "FK_purchase_order_approvals_po"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
      DROP CONSTRAINT "FK_purchase_orders_current_approver"
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE "purchase_order_item_approvals"`);
    await queryRunner.query(`DROP TABLE "purchase_order_approvals"`);

    // Drop columns from purchase_orders
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
      DROP COLUMN "current_approver_id",
      DROP COLUMN "last_rejection_reason",
      DROP COLUMN "rejection_count",
      DROP COLUMN "approval_status"
    `);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "po_item_approval_status_enum"`);
    await queryRunner.query(`DROP TYPE "po_approval_status_enum"`);
    await queryRunner.query(`DROP TYPE "purchase_order_status_enum"`);
  }
}
