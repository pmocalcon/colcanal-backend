import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Acta provisional y requisicion anticipada.
 *
 * Gerencia de Proyectos necesita comprar materiales antes de que el acta exista.
 * Hasta ahora eso era imposible: sin acta no hay codigo de contabilidad, y sin
 * codigo no se genera la requisicion.
 *
 * El camino nuevo es: Gerencia de Proyectos agrupa obras sueltas bajo un numero
 * de acta PROVISIONAL, pide autorizacion a Gerencia para comprar contra el, y con
 * esa autorizacion crea la requisicion sin codigo. Cuando el acta se tramite de
 * verdad y reciba su codigo de contabilidad, el codigo baja solo a esa requisicion.
 *
 * El enganche no necesita columna nueva de union: la requisicion ya vive en una
 * empresa y un proyecto, y con `acta_number` completa la identidad del acta
 * —(empresa, proyecto, numero)—, que es la misma llave unica de work_actas. Es el
 * mismo criterio que se uso en AddActaLinkToDirectorBudgets, donde el presupuesto
 * si necesitaba las tres columnas porque no comparte empresa con el acta.
 *
 * `es_provisional` se cae solo cuando el acta llega a aprobada con su codigo: a
 * partir de ahi es un acta como cualquier otra.
 */
export class AddActaProvisionalYRequisicionAnticipada1751510000000
  implements MigrationInterface
{
  name = 'AddActaProvisionalYRequisicionAnticipada1751510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "work_actas"
        ADD COLUMN IF NOT EXISTS "es_provisional" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "rq_anticipada_status" character varying(20) NOT NULL DEFAULT 'no_aplica',
        ADD COLUMN IF NOT EXISTS "rq_anticipada_justificacion" text,
        ADD COLUMN IF NOT EXISTS "rq_anticipada_motivo" text,
        ADD COLUMN IF NOT EXISTS "rq_anticipada_solicitada_por" integer,
        ADD COLUMN IF NOT EXISTS "rq_anticipada_solicitada_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "rq_anticipada_resuelta_por" integer,
        ADD COLUMN IF NOT EXISTS "rq_anticipada_resuelta_at" TIMESTAMP WITH TIME ZONE
    `);

    // La requisicion guarda el numero del acta a la que se le imputara. Queda
    // vacio en todas las existentes: solo lo llena el camino anticipado.
    await queryRunner.query(`
      ALTER TABLE "requisitions"
        ADD COLUMN IF NOT EXISTS "acta_number" character varying(100)
    `);

    // Se busca por (empresa, proyecto, numero) al aprobar el acta, y por acta
    // pendiente de codigo en la bandeja de control.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_requisitions_acta"
        ON "requisitions" ("company_id", "project_id", "acta_number")
        WHERE "acta_number" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_requisitions_acta"`);
    await queryRunner.query(
      `ALTER TABLE "requisitions" DROP COLUMN IF EXISTS "acta_number"`,
    );
    await queryRunner.query(`
      ALTER TABLE "work_actas"
        DROP COLUMN IF EXISTS "es_provisional",
        DROP COLUMN IF EXISTS "rq_anticipada_status",
        DROP COLUMN IF EXISTS "rq_anticipada_justificacion",
        DROP COLUMN IF EXISTS "rq_anticipada_motivo",
        DROP COLUMN IF EXISTS "rq_anticipada_solicitada_por",
        DROP COLUMN IF EXISTS "rq_anticipada_solicitada_at",
        DROP COLUMN IF EXISTS "rq_anticipada_resuelta_por",
        DROP COLUMN IF EXISTS "rq_anticipada_resuelta_at"
    `);
  }
}
