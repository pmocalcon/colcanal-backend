import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseOrderStatusesTable1763343051609 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create purchase_order_statuses table
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

        // Create index on code for faster lookups
        await queryRunner.query(`
            CREATE INDEX "IDX_purchase_order_statuses_code"
            ON "purchase_order_statuses"("code")
        `);

        // Create index on order for sorting
        await queryRunner.query(`
            CREATE INDEX "IDX_purchase_order_statuses_order"
            ON "purchase_order_statuses"("order")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_purchase_order_statuses_order"`);
        await queryRunner.query(`DROP INDEX "IDX_purchase_order_statuses_code"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "purchase_order_statuses"`);
    }

}
