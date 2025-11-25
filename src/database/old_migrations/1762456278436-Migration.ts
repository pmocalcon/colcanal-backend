import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1762456278436 implements MigrationInterface {
    name = 'Migration1762456278436'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "purchase_order_items" ("po_item_id" SERIAL NOT NULL, "purchase_order_id" integer NOT NULL, "requisition_item_id" integer NOT NULL, "quotation_id" integer NOT NULL, "quantity" numeric(10,2) NOT NULL, "unit_price" numeric(15,2) NOT NULL, "has_iva" boolean NOT NULL DEFAULT true, "iva_percentage" numeric(5,2) NOT NULL DEFAULT '19', "subtotal" numeric(15,2) NOT NULL, "iva_amount" numeric(15,2) NOT NULL, "discount" numeric(15,2) NOT NULL DEFAULT '0', "total_amount" numeric(15,2) NOT NULL, CONSTRAINT "PK_7bb2812689e11702af0f8f3fdec" PRIMARY KEY ("po_item_id"))`);
        await queryRunner.query(`CREATE TABLE "purchase_orders" ("purchase_order_id" SERIAL NOT NULL, "purchase_order_number" character varying(50) NOT NULL, "requisition_id" integer NOT NULL, "supplier_id" integer NOT NULL, "issue_date" date NOT NULL, "subtotal" numeric(15,2) NOT NULL, "total_iva" numeric(15,2) NOT NULL, "total_discount" numeric(15,2) NOT NULL DEFAULT '0', "total_amount" numeric(15,2) NOT NULL, "created_by" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0602174c5ddb1d6c3b7dbeb0840" UNIQUE ("purchase_order_number"), CONSTRAINT "PK_036b6eb08831997f3601d8a737a" PRIMARY KEY ("purchase_order_id"))`);
        await queryRunner.query(`CREATE TABLE "purchase_order_sequences" ("sequence_id" SERIAL NOT NULL, "operation_center_id" integer NOT NULL, "last_number" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1d0d6682daa03a27c7294c70807" UNIQUE ("operation_center_id"), CONSTRAINT "PK_f7b4fe0200f50676c4fe2ac6589" PRIMARY KEY ("sequence_id"))`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_3f92bb44026cedfe235c8b91244" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("purchase_order_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_fccc05040a8e8c13a58d0709517" FOREIGN KEY ("requisition_item_id") REFERENCES "requisition_items"("item_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_bb271faaa127a9d056307cf2226" FOREIGN KEY ("quotation_id") REFERENCES "requisition_item_quotations"("quotation_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_b6dc17d7b047d11acfc96706469" FOREIGN KEY ("requisition_id") REFERENCES "requisitions"("requisition_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_d16a885aa88447ccfd010e739b0" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_99f44faa1ca8d7ec9ebef918b06" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_order_sequences" ADD CONSTRAINT "FK_1d0d6682daa03a27c7294c70807" FOREIGN KEY ("operation_center_id") REFERENCES "operation_centers"("center_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchase_order_sequences" DROP CONSTRAINT "FK_1d0d6682daa03a27c7294c70807"`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_99f44faa1ca8d7ec9ebef918b06"`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_d16a885aa88447ccfd010e739b0"`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_b6dc17d7b047d11acfc96706469"`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_bb271faaa127a9d056307cf2226"`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_fccc05040a8e8c13a58d0709517"`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_3f92bb44026cedfe235c8b91244"`);
        await queryRunner.query(`DROP TABLE "purchase_order_sequences"`);
        await queryRunner.query(`DROP TABLE "purchase_orders"`);
        await queryRunner.query(`DROP TABLE "purchase_order_items"`);
    }

}
