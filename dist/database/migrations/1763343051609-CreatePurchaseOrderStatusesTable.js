"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePurchaseOrderStatusesTable1763343051609 = void 0;
class CreatePurchaseOrderStatusesTable1763343051609 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "purchase_order_statuses" (
                "status_id" SERIAL NOT NULL,
                "code" VARCHAR(50) NOT NULL,
                "name" VARCHAR(100) NOT NULL,
                "description" TEXT,
                "color" VARCHAR(50),
                "order" INTEGER NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_purchase_order_statuses" PRIMARY KEY ("status_id"),
                CONSTRAINT "UQ_purchase_order_statuses_code" UNIQUE ("code")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_purchase_order_statuses_code"
            ON "purchase_order_statuses"("code")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_purchase_order_statuses_order"
            ON "purchase_order_statuses"("order")
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_purchase_order_statuses_order"`);
        await queryRunner.query(`DROP INDEX "IDX_purchase_order_statuses_code"`);
        await queryRunner.query(`DROP TABLE "purchase_order_statuses"`);
    }
}
exports.CreatePurchaseOrderStatusesTable1763343051609 = CreatePurchaseOrderStatusesTable1763343051609;
//# sourceMappingURL=1763343051609-CreatePurchaseOrderStatusesTable.js.map