"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInvoicesTable1763352000000 = void 0;
class CreateInvoicesTable1763352000000 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "invoices" (
                "invoice_id" SERIAL NOT NULL,
                "purchase_order_id" INTEGER NOT NULL,
                "invoice_number" VARCHAR(100) NOT NULL,
                "issue_date" DATE NOT NULL,
                "amount" DECIMAL(12,2) NOT NULL,
                "material_quantity" DECIMAL(10,2) NOT NULL,
                "sent_to_accounting" BOOLEAN NOT NULL DEFAULT false,
                "sent_to_accounting_date" DATE,
                "created_by" INTEGER NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_invoices" PRIMARY KEY ("invoice_id"),
                CONSTRAINT "UQ_invoices_invoice_number" UNIQUE ("invoice_number"),
                CONSTRAINT "FK_invoices_purchase_order" FOREIGN KEY ("purchase_order_id")
                    REFERENCES "purchase_orders"("purchase_order_id") ON DELETE CASCADE,
                CONSTRAINT "FK_invoices_created_by" FOREIGN KEY ("created_by")
                    REFERENCES "users"("user_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_invoices_purchase_order_id"
            ON "invoices"("purchase_order_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_invoices_sent_to_accounting"
            ON "invoices"("sent_to_accounting")
        `);
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ADD COLUMN "total_invoiced_amount" DECIMAL(12,2) DEFAULT 0,
            ADD COLUMN "total_invoiced_quantity" DECIMAL(10,2) DEFAULT 0,
            ADD COLUMN "invoice_status" VARCHAR(50) DEFAULT 'sin_factura'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_purchase_orders_invoice_status"
            ON "purchase_orders"("invoice_status")
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_purchase_orders_invoice_status"`);
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            DROP COLUMN "invoice_status",
            DROP COLUMN "total_invoiced_quantity",
            DROP COLUMN "total_invoiced_amount"
        `);
        await queryRunner.query(`DROP INDEX "IDX_invoices_sent_to_accounting"`);
        await queryRunner.query(`DROP INDEX "IDX_invoices_purchase_order_id"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
    }
}
exports.CreateInvoicesTable1763352000000 = CreateInvoicesTable1763352000000;
//# sourceMappingURL=1763352000000-CreateInvoicesTable.js.map