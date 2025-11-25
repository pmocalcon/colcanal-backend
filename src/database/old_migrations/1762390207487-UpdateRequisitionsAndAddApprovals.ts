import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRequisitionsAndAddApprovals1762390207487
  implements MigrationInterface
{
  name = 'UpdateRequisitionsAndAddApprovals1762390207487';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Crear tabla requisition_approvals
    // ============================================
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

    // ============================================
    // 2. Agregar índice para consultas de aprobaciones
    // ============================================
    await queryRunner.query(`
      CREATE INDEX "IDX_requisition_approvals_requisition_id"
      ON "requisition_approvals" ("requisition_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_requisition_approvals_user_id"
      ON "requisition_approvals" ("user_id")
    `);

    // ============================================
    // 3. Modificar tabla requisitions
    // ============================================

    // Primero, agregar la columna status_id como nullable
    await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD COLUMN "status_id" integer
    `);

    // Migrar datos: asignar status_id basado en el status actual (texto)
    // Asumiendo que 'Pendiente' = status_id 1
    await queryRunner.query(`
      UPDATE "requisitions"
      SET "status_id" = 1
      WHERE "status_id" IS NULL
    `);

    // Hacer status_id NOT NULL después de migrar datos
    await queryRunner.query(`
      ALTER TABLE "requisitions"
      ALTER COLUMN "status_id" SET NOT NULL
    `);

    // Establecer default
    await queryRunner.query(`
      ALTER TABLE "requisitions"
      ALTER COLUMN "status_id" SET DEFAULT 1
    `);

    // Agregar nuevas columnas para tracking de revisores/aprobadores
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

    // ============================================
    // 4. Agregar foreign keys
    // ============================================

    // FK de requisitions a requisition_statuses
    await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD CONSTRAINT "FK_requisitions_status_id"
      FOREIGN KEY ("status_id")
      REFERENCES "requisition_statuses"("status_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    // FK de requisitions a users (reviewed_by)
    await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD CONSTRAINT "FK_requisitions_reviewed_by"
      FOREIGN KEY ("reviewed_by")
      REFERENCES "users"("user_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    // FK de requisitions a users (approved_by)
    await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD CONSTRAINT "FK_requisitions_approved_by"
      FOREIGN KEY ("approved_by")
      REFERENCES "users"("user_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    // FK de requisition_approvals a requisitions
    await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      ADD CONSTRAINT "FK_requisition_approvals_requisition_id"
      FOREIGN KEY ("requisition_id")
      REFERENCES "requisitions"("requisition_id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    // FK de requisition_approvals a users
    await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      ADD CONSTRAINT "FK_requisition_approvals_user_id"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("user_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    // FK de requisition_approvals a requisition_statuses (previous_status_id)
    await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      ADD CONSTRAINT "FK_requisition_approvals_previous_status_id"
      FOREIGN KEY ("previous_status_id")
      REFERENCES "requisition_statuses"("status_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    // FK de requisition_approvals a requisition_statuses (new_status_id)
    await queryRunner.query(`
      ALTER TABLE "requisition_approvals"
      ADD CONSTRAINT "FK_requisition_approvals_new_status_id"
      FOREIGN KEY ("new_status_id")
      REFERENCES "requisition_statuses"("status_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    // ============================================
    // 5. FINALMENTE: Eliminar columna status antigua (varchar)
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP COLUMN "status"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir en orden inverso

    // Restaurar columna status como varchar
    await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD COLUMN "status" character varying(50) NOT NULL DEFAULT 'Pendiente'
    `);

    // Migrar datos de vuelta (status_id → status texto)
    await queryRunner.query(`
      UPDATE "requisitions" r
      SET "status" = rs.code
      FROM "requisition_statuses" rs
      WHERE r."status_id" = rs."status_id"
    `);

    // Drop foreign keys de requisitions
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

    // Drop foreign keys de requisition_approvals
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

    // Drop columnas de requisitions
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

    // Drop índices
    await queryRunner.query(`
      DROP INDEX "IDX_requisition_approvals_user_id"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_requisition_approvals_requisition_id"
    `);

    // Drop tabla
    await queryRunner.query(`
      DROP TABLE "requisition_approvals"
    `);
  }
}
