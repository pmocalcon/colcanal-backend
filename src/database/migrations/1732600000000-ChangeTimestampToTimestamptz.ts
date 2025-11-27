import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeTimestampToTimestamptz1732600000000 implements MigrationInterface {
    name = 'ChangeTimestampToTimestamptz1732600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Cambiar todas las columnas timestamp a timestamptz para soportar zona horaria
        // PostgreSQL convertirá los datos existentes UTC a timestamptz automáticamente

        // users
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "creado_en" TYPE TIMESTAMPTZ USING "creado_en" AT TIME ZONE 'UTC'
        `);

        // requisitions
        await queryRunner.query(`
            ALTER TABLE "requisitions"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "requisitions"
            ALTER COLUMN "reviewed_at" TYPE TIMESTAMPTZ USING "reviewed_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "approved_at" TYPE TIMESTAMPTZ USING "approved_at" AT TIME ZONE 'UTC'
        `);

        // requisition_logs
        await queryRunner.query(`
            ALTER TABLE "requisition_logs"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'
        `);

        // requisition_approvals
        await queryRunner.query(`
            ALTER TABLE "requisition_approvals"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'
        `);

        // requisition_item_approvals
        await queryRunner.query(`
            ALTER TABLE "requisition_item_approvals"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'
        `);

        // requisition_item_quotations
        await queryRunner.query(`
            ALTER TABLE "requisition_item_quotations"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'
        `);

        // suppliers
        await queryRunner.query(`
            ALTER TABLE "suppliers"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'
        `);

        // purchase_orders
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'
        `);

        // purchase_order_approvals
        await queryRunner.query(`
            ALTER TABLE "purchase_order_approvals"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "approval_date" TYPE TIMESTAMPTZ USING "approval_date" AT TIME ZONE 'UTC',
            ALTER COLUMN "deadline" TYPE TIMESTAMPTZ USING "deadline" AT TIME ZONE 'UTC'
        `);

        // purchase_order_item_approvals
        await queryRunner.query(`
            ALTER TABLE "purchase_order_item_approvals"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'
        `);

        // purchase_order_sequences
        await queryRunner.query(`
            ALTER TABLE "purchase_order_sequences"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'
        `);

        // invoices
        await queryRunner.query(`
            ALTER TABLE "invoices"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'
        `);

        // material_receipts
        await queryRunner.query(`
            ALTER TABLE "material_receipts"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'
        `);

        // material_price_history
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'
        `);

        console.log('✅ Migración completada: Todas las columnas timestamp ahora son timestamptz');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir a timestamp (sin zona horaria)

        // users
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "creado_en" TYPE TIMESTAMP USING "creado_en" AT TIME ZONE 'UTC'
        `);

        // requisitions
        await queryRunner.query(`
            ALTER TABLE "requisitions"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "requisitions"
            ALTER COLUMN "reviewed_at" TYPE TIMESTAMP USING "reviewed_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "approved_at" TYPE TIMESTAMP USING "approved_at" AT TIME ZONE 'UTC'
        `);

        // requisition_logs
        await queryRunner.query(`
            ALTER TABLE "requisition_logs"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'
        `);

        // requisition_approvals
        await queryRunner.query(`
            ALTER TABLE "requisition_approvals"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'
        `);

        // requisition_item_approvals
        await queryRunner.query(`
            ALTER TABLE "requisition_item_approvals"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'
        `);

        // requisition_item_quotations
        await queryRunner.query(`
            ALTER TABLE "requisition_item_quotations"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'
        `);

        // suppliers
        await queryRunner.query(`
            ALTER TABLE "suppliers"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC'
        `);

        // purchase_orders
        await queryRunner.query(`
            ALTER TABLE "purchase_orders"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC'
        `);

        // purchase_order_approvals
        await queryRunner.query(`
            ALTER TABLE "purchase_order_approvals"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "approval_date" TYPE TIMESTAMP USING "approval_date" AT TIME ZONE 'UTC',
            ALTER COLUMN "deadline" TYPE TIMESTAMP USING "deadline" AT TIME ZONE 'UTC'
        `);

        // purchase_order_item_approvals
        await queryRunner.query(`
            ALTER TABLE "purchase_order_item_approvals"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'
        `);

        // purchase_order_sequences
        await queryRunner.query(`
            ALTER TABLE "purchase_order_sequences"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC'
        `);

        // invoices
        await queryRunner.query(`
            ALTER TABLE "invoices"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC'
        `);

        // material_receipts
        await queryRunner.query(`
            ALTER TABLE "material_receipts"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC',
            ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC'
        `);

        // material_price_history
        await queryRunner.query(`
            ALTER TABLE "material_price_history"
            ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'
        `);

        console.log('⏪ Migración revertida: Las columnas volvieron a ser timestamp');
    }
}
