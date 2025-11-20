import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertPurchaseOrderApprovalStatusToFK1763343323271 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Add temporary new column for status FK
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ADD COLUMN "approval_status_id_new" INTEGER
        `);

        // Step 2: Populate the new column based on current enum values
        // Map enum values to purchase_order_statuses IDs
        await queryRunner.query(`
            UPDATE "purchase_orders" SET "approval_status_id_new" = (
                CASE "approval_status"
                    WHEN 'borrador' THEN (SELECT status_id FROM purchase_order_statuses WHERE code = 'borrador')
                    WHEN 'pendiente_aprobacion_gerencia' THEN (SELECT status_id FROM purchase_order_statuses WHERE code = 'pendiente_aprobacion_gerencia')
                    WHEN 'aprobada_gerencia' THEN (SELECT status_id FROM purchase_order_statuses WHERE code = 'aprobada_gerencia')
                    WHEN 'rechazada_gerencia' THEN (SELECT status_id FROM purchase_order_statuses WHERE code = 'rechazada_gerencia')
                    WHEN 'en_recepcion' THEN (SELECT status_id FROM purchase_order_statuses WHERE code = 'en_recepcion')
                    WHEN 'completada' THEN (SELECT status_id FROM purchase_order_statuses WHERE code = 'completada')
                END
            )
        `);

        // Step 3: Make the new column NOT NULL (now that all rows have values)
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ALTER COLUMN "approval_status_id_new" SET NOT NULL
        `);

        // Step 4: Drop the old enum column
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            DROP COLUMN "approval_status"
        `);

        // Step 5: Drop the enum type (no longer needed)
        await queryRunner.query(`
            DROP TYPE IF EXISTS "purchase_order_status_enum"
        `);

        // Step 6: Rename the new column to the final name
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            RENAME COLUMN "approval_status_id_new" TO "approval_status_id"
        `);

        // Step 7: Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ADD CONSTRAINT "FK_purchase_orders_approval_status"
            FOREIGN KEY ("approval_status_id")
            REFERENCES "purchase_order_statuses"("status_id")
            ON DELETE RESTRICT
            ON UPDATE NO ACTION
        `);

        // Step 8: Add index for better query performance
        await queryRunner.query(`
            CREATE INDEX "IDX_purchase_orders_approval_status"
            ON "purchase_orders"("approval_status_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse Step 8: Drop index
        await queryRunner.query(`
            DROP INDEX "IDX_purchase_orders_approval_status"
        `);

        // Reverse Step 7: Drop foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            DROP CONSTRAINT "FK_purchase_orders_approval_status"
        `);

        // Reverse Step 6: Rename column back to temporary name
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            RENAME COLUMN "approval_status_id" TO "approval_status_id_new"
        `);

        // Reverse Step 5: Recreate the enum type
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

        // Reverse Step 4: Add back the enum column
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ADD COLUMN "approval_status" "purchase_order_status_enum"
            DEFAULT 'pendiente_aprobacion_gerencia'
        `);

        // Reverse Step 2: Populate enum column from FK values
        await queryRunner.query(`
            UPDATE "purchase_orders" SET "approval_status" = (
                SELECT CASE s.code
                    WHEN 'borrador' THEN 'borrador'::purchase_order_status_enum
                    WHEN 'pendiente_aprobacion_gerencia' THEN 'pendiente_aprobacion_gerencia'::purchase_order_status_enum
                    WHEN 'aprobada_gerencia' THEN 'aprobada_gerencia'::purchase_order_status_enum
                    WHEN 'rechazada_gerencia' THEN 'rechazada_gerencia'::purchase_order_status_enum
                    WHEN 'en_recepcion' THEN 'en_recepcion'::purchase_order_status_enum
                    WHEN 'completada' THEN 'completada'::purchase_order_status_enum
                END
                FROM purchase_order_statuses s
                WHERE s.status_id = "purchase_orders"."approval_status_id_new"
            )
        `);

        // Reverse Step 3: Make enum column NOT NULL
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ALTER COLUMN "approval_status" SET NOT NULL
        `);

        // Reverse Step 1: Drop the temporary FK column
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            DROP COLUMN "approval_status_id_new"
        `);
    }

}
