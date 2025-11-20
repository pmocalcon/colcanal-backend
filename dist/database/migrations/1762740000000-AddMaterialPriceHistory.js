"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddMaterialPriceHistory1762740000000 = void 0;
class AddMaterialPriceHistory1762740000000 {
    name = 'AddMaterialPriceHistory1762740000000';
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "material_price_history" (
                "price_history_id" SERIAL NOT NULL,
                "material_id" integer NOT NULL,
                "supplier_id" integer NOT NULL,
                "unit_price" numeric(15,2) NOT NULL,
                "has_iva" boolean NOT NULL DEFAULT true,
                "iva_percentage" numeric(5,2) NOT NULL DEFAULT 19,
                "discount" numeric(15,2) NOT NULL DEFAULT 0,
                "purchase_order_item_id" integer NOT NULL,
                "purchase_order_id" integer NOT NULL,
                "created_by" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_material_price_history" PRIMARY KEY ("price_history_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_material_price_history_material_supplier"
            ON "material_price_history" ("material_id", "supplier_id", "created_at" DESC)
        `);
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            ADD CONSTRAINT "FK_material_price_history_material"
            FOREIGN KEY ("material_id")
            REFERENCES "materials"("material_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            ADD CONSTRAINT "FK_material_price_history_supplier"
            FOREIGN KEY ("supplier_id")
            REFERENCES "suppliers"("supplier_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            ADD CONSTRAINT "FK_material_price_history_po_item"
            FOREIGN KEY ("purchase_order_item_id")
            REFERENCES "purchase_order_items"("po_item_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            ADD CONSTRAINT "FK_material_price_history_po"
            FOREIGN KEY ("purchase_order_id")
            REFERENCES "purchase_orders"("purchase_order_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            ADD CONSTRAINT "FK_material_price_history_created_by"
            FOREIGN KEY ("created_by")
            REFERENCES "users"("user_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            DROP CONSTRAINT "FK_material_price_history_created_by"
        `);
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            DROP CONSTRAINT "FK_material_price_history_po"
        `);
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            DROP CONSTRAINT "FK_material_price_history_po_item"
        `);
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            DROP CONSTRAINT "FK_material_price_history_supplier"
        `);
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            DROP CONSTRAINT "FK_material_price_history_material"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_material_price_history_material_supplier"
        `);
        await queryRunner.query(`DROP TABLE "material_price_history"`);
    }
}
exports.AddMaterialPriceHistory1762740000000 = AddMaterialPriceHistory1762740000000;
//# sourceMappingURL=1762740000000-AddMaterialPriceHistory.js.map