"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddMaterialReceipts1762500000000 = void 0;
class AddMaterialReceipts1762500000000 {
    name = 'AddMaterialReceipts1762500000000';
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "material_receipts" (
                "receipt_id" SERIAL NOT NULL,
                "po_item_id" integer NOT NULL,
                "quantity_received" numeric(10,2) NOT NULL,
                "received_date" date NOT NULL,
                "observations" text,
                "overdelivery_justification" text,
                "created_by" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_material_receipts" PRIMARY KEY ("receipt_id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "material_receipts"
            ADD CONSTRAINT "FK_material_receipts_po_item"
            FOREIGN KEY ("po_item_id")
            REFERENCES "purchase_order_items"("po_item_id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "material_receipts"
            ADD CONSTRAINT "FK_material_receipts_created_by"
            FOREIGN KEY ("created_by")
            REFERENCES "users"("user_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            DELETE FROM "requisition_statuses" WHERE code = 'finalizada'
        `);
        await queryRunner.query(`
            INSERT INTO "requisition_statuses"
            (code, name, description, color, "order")
            VALUES
            ('en_recepcion', 'En recepción', 'Recepción parcial de materiales en proceso', 'violet', 11),
            ('recepcion_completa', 'Recepción completa', 'Todos los materiales recibidos', 'teal', 12)
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "material_receipts"
            DROP CONSTRAINT "FK_material_receipts_created_by"
        `);
        await queryRunner.query(`
            ALTER TABLE "material_receipts"
            DROP CONSTRAINT "FK_material_receipts_po_item"
        `);
        await queryRunner.query(`DROP TABLE "material_receipts"`);
        await queryRunner.query(`
            DELETE FROM "requisition_statuses"
            WHERE code IN ('en_recepcion', 'recepcion_completa')
        `);
        await queryRunner.query(`
            INSERT INTO "requisition_statuses"
            (code, name, description, color, "order")
            VALUES
            ('finalizada', 'Finalizada', 'Recepción completada', 'teal', 11)
        `);
    }
}
exports.AddMaterialReceipts1762500000000 = AddMaterialReceipts1762500000000;
//# sourceMappingURL=1762500000000-AddMaterialReceipts.js.map