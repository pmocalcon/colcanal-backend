"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddRequisitionItemApprovals1762730000000 = void 0;
class AddRequisitionItemApprovals1762730000000 {
    name = 'AddRequisitionItemApprovals1762730000000';
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "requisition_item_approvals" (
                "item_approval_id" SERIAL NOT NULL,
                "requisition_id" integer NOT NULL,
                "item_number" integer NOT NULL,
                "material_id" integer NOT NULL,
                "quantity" numeric(10,2) NOT NULL,
                "observation" text,
                "requisition_item_id" integer,
                "user_id" integer NOT NULL,
                "approval_level" varchar(20) NOT NULL,
                "status" varchar(20) NOT NULL,
                "comments" text,
                "is_valid" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_requisition_item_approvals" PRIMARY KEY ("item_approval_id")
            )
        `);
        await queryRunner.query(`
            COMMENT ON TABLE "requisition_item_approvals" IS 'Tracks item-level approvals for requisitions';
            COMMENT ON COLUMN "requisition_item_approvals"."item_number" IS 'Item number within the requisition';
            COMMENT ON COLUMN "requisition_item_approvals"."material_id" IS 'Material ID for matching items even after recreation';
            COMMENT ON COLUMN "requisition_item_approvals"."quantity" IS 'Quantity for matching items even after recreation';
            COMMENT ON COLUMN "requisition_item_approvals"."observation" IS 'Observation for matching items even after recreation';
            COMMENT ON COLUMN "requisition_item_approvals"."requisition_item_id" IS 'Current item ID (may change if item is recreated)';
            COMMENT ON COLUMN "requisition_item_approvals"."approval_level" IS 'Either reviewer or management';
            COMMENT ON COLUMN "requisition_item_approvals"."status" IS 'Either approved or rejected';
            COMMENT ON COLUMN "requisition_item_approvals"."is_valid" IS 'Becomes false if item is modified after approval'
        `);
        await queryRunner.query(`
            ALTER TABLE "requisition_item_approvals"
            ADD CONSTRAINT "FK_item_approval_requisition"
            FOREIGN KEY ("requisition_id")
            REFERENCES "requisitions"("requisition_id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "requisition_item_approvals"
            ADD CONSTRAINT "FK_item_approval_item"
            FOREIGN KEY ("requisition_item_id")
            REFERENCES "requisition_items"("item_id")
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "requisition_item_approvals"
            ADD CONSTRAINT "FK_item_approval_user"
            FOREIGN KEY ("user_id")
            REFERENCES "users"("user_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_item_approval_unique"
            ON "requisition_item_approvals" ("requisition_id", "item_number", "material_id", "approval_level")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_item_approval_requisition"
            ON "requisition_item_approvals" ("requisition_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_item_approval_valid"
            ON "requisition_item_approvals" ("is_valid")
            WHERE "is_valid" = true
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_item_approval_valid"`);
        await queryRunner.query(`DROP INDEX "IDX_item_approval_requisition"`);
        await queryRunner.query(`DROP INDEX "IDX_item_approval_unique"`);
        await queryRunner.query(`
            ALTER TABLE "requisition_item_approvals"
            DROP CONSTRAINT "FK_item_approval_user"
        `);
        await queryRunner.query(`
            ALTER TABLE "requisition_item_approvals"
            DROP CONSTRAINT "FK_item_approval_item"
        `);
        await queryRunner.query(`
            ALTER TABLE "requisition_item_approvals"
            DROP CONSTRAINT "FK_item_approval_requisition"
        `);
        await queryRunner.query(`DROP TABLE "requisition_item_approvals"`);
    }
}
exports.AddRequisitionItemApprovals1762730000000 = AddRequisitionItemApprovals1762730000000;
//# sourceMappingURL=1762730000000-AddRequisitionItemApprovals.js.map