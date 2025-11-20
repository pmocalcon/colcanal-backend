"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConvertPurchaseOrderApprovalStatusToFK1763343323271 = void 0;
class ConvertPurchaseOrderApprovalStatusToFK1763343323271 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ADD COLUMN "approval_status_id_new" INTEGER
        `);
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
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ALTER COLUMN "approval_status_id_new" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            DROP COLUMN "approval_status"
        `);
        await queryRunner.query(`
            DROP TYPE IF EXISTS "purchase_order_status_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            RENAME COLUMN "approval_status_id_new" TO "approval_status_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ADD CONSTRAINT "FK_purchase_orders_approval_status"
            FOREIGN KEY ("approval_status_id")
            REFERENCES "purchase_order_statuses"("status_id")
            ON DELETE RESTRICT
            ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_purchase_orders_approval_status"
            ON "purchase_orders"("approval_status_id")
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            DROP INDEX "IDX_purchase_orders_approval_status"
        `);
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            DROP CONSTRAINT "FK_purchase_orders_approval_status"
        `);
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            RENAME COLUMN "approval_status_id" TO "approval_status_id_new"
        `);
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
            ALTER TABLE "purchase_orders"
            ADD COLUMN "approval_status" "purchase_order_status_enum"
            DEFAULT 'pendiente_aprobacion_gerencia'
        `);
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
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ALTER COLUMN "approval_status" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            DROP COLUMN "approval_status_id_new"
        `);
    }
}
exports.ConvertPurchaseOrderApprovalStatusToFK1763343323271 = ConvertPurchaseOrderApprovalStatusToFK1763343323271;
//# sourceMappingURL=1763343323271-ConvertPurchaseOrderApprovalStatusToFK.js.map