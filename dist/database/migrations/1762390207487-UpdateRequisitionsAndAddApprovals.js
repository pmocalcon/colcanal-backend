"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRequisitionsAndAddApprovals1762390207487 = void 0;
class UpdateRequisitionsAndAddApprovals1762390207487 {
    name = 'UpdateRequisitionsAndAddApprovals1762390207487';
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE "requisition_approvals" (
        "approval_id" SERIAL NOT NULL,
        "requisition_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "action" character varying(20) NOT NULL,
        "step_order" integer NOT NULL,
        "previous_status_id" integer,
        "new_status_id" integer NOT NULL,
        "comments" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_requisition_approvals" PRIMARY KEY ("approval_id")
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_requisition_approvals_requisition_id"
      ON "requisition_approvals" ("requisition_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_requisition_approvals_user_id"
      ON "requisition_approvals" ("user_id")
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD COLUMN "status_id" integer
    `);
        await queryRunner.query(`
      UPDATE "requisitions"
      SET "status_id" = 1
      WHERE "status_id" IS NULL
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ALTER COLUMN "status_id" SET NOT NULL
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ALTER COLUMN "status_id" SET DEFAULT 1
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD COLUMN "reviewed_by" integer
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD COLUMN "approved_by" integer
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD COLUMN "reviewed_at" TIMESTAMP
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD COLUMN "approved_at" TIMESTAMP
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD CONSTRAINT "FK_requisitions_status_id"
      FOREIGN KEY ("status_id")
      REFERENCES "requisition_statuses"("status_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD CONSTRAINT "FK_requisitions_reviewed_by"
      FOREIGN KEY ("reviewed_by")
      REFERENCES "users"("user_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD CONSTRAINT "FK_requisitions_approved_by"
      FOREIGN KEY ("approved_by")
      REFERENCES "users"("user_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      ADD CONSTRAINT "FK_requisition_approvals_requisition_id"
      FOREIGN KEY ("requisition_id")
      REFERENCES "requisitions"("requisition_id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      ADD CONSTRAINT "FK_requisition_approvals_user_id"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("user_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      ADD CONSTRAINT "FK_requisition_approvals_previous_status_id"
      FOREIGN KEY ("previous_status_id")
      REFERENCES "requisition_statuses"("status_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      ADD CONSTRAINT "FK_requisition_approvals_new_status_id"
      FOREIGN KEY ("new_status_id")
      REFERENCES "requisition_statuses"("status_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP COLUMN "status"
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD COLUMN "status" character varying(50) NOT NULL DEFAULT 'Pendiente'
    `);
        await queryRunner.query(`
      UPDATE "requisitions" r
      SET "status" = rs.code
      FROM "requisition_statuses" rs
      WHERE r."status_id" = rs."status_id"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP CONSTRAINT "FK_requisitions_approved_by"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP CONSTRAINT "FK_requisitions_reviewed_by"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP CONSTRAINT "FK_requisitions_status_id"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      DROP CONSTRAINT "FK_requisition_approvals_new_status_id"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      DROP CONSTRAINT "FK_requisition_approvals_previous_status_id"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      DROP CONSTRAINT "FK_requisition_approvals_user_id"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      DROP CONSTRAINT "FK_requisition_approvals_requisition_id"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP COLUMN "approved_at"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP COLUMN "reviewed_at"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP COLUMN "approved_by"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP COLUMN "reviewed_by"
    `);
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP COLUMN "status_id"
    `);
        await queryRunner.query(`
      DROP INDEX "IDX_requisition_approvals_user_id"
    `);
        await queryRunner.query(`
      DROP INDEX "IDX_requisition_approvals_requisition_id"
    `);
        await queryRunner.query(`
      DROP TABLE "requisition_approvals"
    `);
    }
}
exports.UpdateRequisitionsAndAddApprovals1762390207487 = UpdateRequisitionsAndAddApprovals1762390207487;
//# sourceMappingURL=1762390207487-UpdateRequisitionsAndAddApprovals.js.map