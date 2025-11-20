import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1762390207486 implements MigrationInterface {
    name = 'Migration1762390207486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`ALTER TABLE "autorizaciones" DROP CONSTRAINT "UQ_20a4363296ff25a196127f7cfb8"`); // Comentado - tabla no existe en DB nueva
        await queryRunner.query(`CREATE TABLE "requisition_items" ("item_id" SERIAL NOT NULL, "requisition_id" integer NOT NULL, "item_number" integer NOT NULL, "material_id" integer NOT NULL, "quantity" numeric(10,2) NOT NULL, "observation" text, CONSTRAINT "PK_1308206f15577f0e5d02d91e89a" PRIMARY KEY ("item_id"))`);
        await queryRunner.query(`CREATE TABLE "requisition_logs" ("log_id" SERIAL NOT NULL, "requisition_id" integer NOT NULL, "user_id" integer NOT NULL, "action" character varying(50) NOT NULL, "previous_status" character varying(50), "new_status" character varying(50), "comments" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3f69f4fae204d8a9b8ecce1a197" PRIMARY KEY ("log_id"))`);
        await queryRunner.query(`CREATE TABLE "requisitions" ("requisition_id" SERIAL NOT NULL, "requisition_number" character varying(20) NOT NULL, "company_id" integer NOT NULL, "project_id" integer, "operation_center_id" integer NOT NULL, "project_code_id" integer, "created_by" integer NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'Pendiente', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_336248fc877356e46eae498db96" UNIQUE ("requisition_number"), CONSTRAINT "PK_53968828441803c91cfac24a9c3" PRIMARY KEY ("requisition_id"))`);
        await queryRunner.query(`CREATE TABLE "requisition_statuses" ("status_id" SERIAL NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "description" text, "color" character varying(20), "order" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_b73f3fd80d5b10ca8d77cccea71" UNIQUE ("code"), CONSTRAINT "PK_ba888fcc299f81542bd594c7d4d" PRIMARY KEY ("status_id"))`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" ADD "gestion_id" integer`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" ADD "nivel" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" ADD "es_activo" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" ADD CONSTRAINT "UQ_ea3f288e9b312867a7c1910e747" UNIQUE ("usuario_autorizador", "usuario_autorizado", "gestion_id", "tipo_autorizacion")`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" ADD CONSTRAINT "FK_d513c4635b4fbbd21bf6f038b57" FOREIGN KEY ("gestion_id") REFERENCES "gestiones"("gestion_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisition_items" ADD CONSTRAINT "FK_2afa61cf14fa20efa7dc12883dd" FOREIGN KEY ("requisition_id") REFERENCES "requisitions"("requisition_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisition_items" ADD CONSTRAINT "FK_1bf306094b3d8782af6d992f8cd" FOREIGN KEY ("material_id") REFERENCES "materials"("material_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisition_logs" ADD CONSTRAINT "FK_2ce62bd2878379fff40a31c5f46" FOREIGN KEY ("requisition_id") REFERENCES "requisitions"("requisition_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisition_logs" ADD CONSTRAINT "FK_69004bcf40cd8b939b80c719edb" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisitions" ADD CONSTRAINT "FK_ffc23c3920e6f0d32fb81d863ef" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisitions" ADD CONSTRAINT "FK_aa0a90bd57f7788e568ce02537c" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisitions" ADD CONSTRAINT "FK_a42eaa4b5715ad2034069ce1adc" FOREIGN KEY ("operation_center_id") REFERENCES "operation_centers"("center_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisitions" ADD CONSTRAINT "FK_1e45b6147eafd25c372e6015362" FOREIGN KEY ("project_code_id") REFERENCES "project_codes"("code_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requisitions" ADD CONSTRAINT "FK_fa4dccbc37b64cfed3ff6999afa" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requisitions" DROP CONSTRAINT "FK_fa4dccbc37b64cfed3ff6999afa"`);
        await queryRunner.query(`ALTER TABLE "requisitions" DROP CONSTRAINT "FK_1e45b6147eafd25c372e6015362"`);
        await queryRunner.query(`ALTER TABLE "requisitions" DROP CONSTRAINT "FK_a42eaa4b5715ad2034069ce1adc"`);
        await queryRunner.query(`ALTER TABLE "requisitions" DROP CONSTRAINT "FK_aa0a90bd57f7788e568ce02537c"`);
        await queryRunner.query(`ALTER TABLE "requisitions" DROP CONSTRAINT "FK_ffc23c3920e6f0d32fb81d863ef"`);
        await queryRunner.query(`ALTER TABLE "requisition_logs" DROP CONSTRAINT "FK_69004bcf40cd8b939b80c719edb"`);
        await queryRunner.query(`ALTER TABLE "requisition_logs" DROP CONSTRAINT "FK_2ce62bd2878379fff40a31c5f46"`);
        await queryRunner.query(`ALTER TABLE "requisition_items" DROP CONSTRAINT "FK_1bf306094b3d8782af6d992f8cd"`);
        await queryRunner.query(`ALTER TABLE "requisition_items" DROP CONSTRAINT "FK_2afa61cf14fa20efa7dc12883dd"`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" DROP CONSTRAINT "FK_d513c4635b4fbbd21bf6f038b57"`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" DROP CONSTRAINT "UQ_ea3f288e9b312867a7c1910e747"`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" DROP COLUMN "es_activo"`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" DROP COLUMN "nivel"`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" DROP COLUMN "gestion_id"`);
        await queryRunner.query(`DROP TABLE "requisition_statuses"`);
        await queryRunner.query(`DROP TABLE "requisitions"`);
        await queryRunner.query(`DROP TABLE "requisition_logs"`);
        await queryRunner.query(`DROP TABLE "requisition_items"`);
        await queryRunner.query(`ALTER TABLE "autorizaciones" ADD CONSTRAINT "UQ_20a4363296ff25a196127f7cfb8" UNIQUE ("usuario_autorizador", "usuario_autorizado", "tipo_autorizacion")`);
    }

}
