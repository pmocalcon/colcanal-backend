import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPriceFieldsToQuotations1762710558838 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agregar campos de precio a requisition_item_quotations
        await queryRunner.query(`
            ALTER TABLE "requisition_item_quotations"
            ADD COLUMN "unit_price" NUMERIC(15,2),
            ADD COLUMN "has_iva" BOOLEAN DEFAULT false,
            ADD COLUMN "discount" NUMERIC(15,2) DEFAULT 0,
            ADD COLUMN "is_selected" BOOLEAN DEFAULT false
        `);

        // Agregar comentarios para claridad
        await queryRunner.query(`
            COMMENT ON COLUMN "requisition_item_quotations"."unit_price" IS 'Precio unitario sin IVA ingresado por Compras';
            COMMENT ON COLUMN "requisition_item_quotations"."has_iva" IS 'Indica si el ítem tiene IVA del 19%';
            COMMENT ON COLUMN "requisition_item_quotations"."discount" IS 'Descuento aplicado al ítem';
            COMMENT ON COLUMN "requisition_item_quotations"."is_selected" IS 'Marca el proveedor seleccionado cuando hay múltiples opciones'
        `);

        // Crear índice para mejorar consultas
        await queryRunner.query(`
            CREATE INDEX "IDX_quotation_selected" ON "requisition_item_quotations" ("is_selected") WHERE "is_selected" = true
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar índice
        await queryRunner.query(`DROP INDEX "IDX_quotation_selected"`);

        // Eliminar columnas
        await queryRunner.query(`
            ALTER TABLE "requisition_item_quotations"
            DROP COLUMN "unit_price",
            DROP COLUMN "has_iva",
            DROP COLUMN "discount",
            DROP COLUMN "is_selected"
        `);
    }

}
