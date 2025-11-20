import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuppliersAndQuotations1762447647420 implements MigrationInterface {
    name = 'AddSuppliersAndQuotations1762447647420'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "requisition_item_quotations" ("quotation_id" SERIAL NOT NULL, "requisition_item_id" integer NOT NULL, "action" character varying(20) NOT NULL, "supplier_id" integer, "supplier_order" smallint NOT NULL DEFAULT '1', "justification" text, "observations" text, "version" integer NOT NULL DEFAULT '1', "is_active" boolean NOT NULL DEFAULT true, "created_by" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7810fe6b144f108c82817c91df3" PRIMARY KEY ("quotation_id")); COMMENT ON COLUMN "requisition_item_quotations"."action" IS 'cotizar | no_requiere'; COMMENT ON COLUMN "requisition_item_quotations"."supplier_order" IS '1 for first supplier, 2 for second supplier'`);
        await queryRunner.query(`CREATE TABLE "suppliers" ("supplier_id" SERIAL NOT NULL, "name" character varying(200) NOT NULL, "nit_cc" character varying(50) NOT NULL, "phone" character varying(50) NOT NULL, "address" character varying(200) NOT NULL, "city" character varying(100) NOT NULL, "email" character varying(100), "contact_person" character varying(100), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a2692f796d16e0a30040860112a" PRIMARY KEY ("supplier_id"))`);
        await queryRunner.query(`ALTER TABLE "requisition_item_quotations" ADD CONSTRAINT "FK_4a9b01815781ce5032816a04e15" FOREIGN KEY ("requisition_item_id") REFERENCES "requisition_items"("item_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisition_item_quotations" ADD CONSTRAINT "FK_f53501734d05a31edf51069dea8" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisition_item_quotations" ADD CONSTRAINT "FK_cf815cda28c8f4a950a6bd67538" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requisition_item_quotations" DROP CONSTRAINT "FK_cf815cda28c8f4a950a6bd67538"`);
        await queryRunner.query(`ALTER TABLE "requisition_item_quotations" DROP CONSTRAINT "FK_f53501734d05a31edf51069dea8"`);
        await queryRunner.query(`ALTER TABLE "requisition_item_quotations" DROP CONSTRAINT "FK_4a9b01815781ce5032816a04e15"`);
        await queryRunner.query(`DROP TABLE "suppliers"`);
        await queryRunner.query(`DROP TABLE "requisition_item_quotations"`);
    }

}
