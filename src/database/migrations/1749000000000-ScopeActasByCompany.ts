import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Da scope por empresa a las actas (work_actas).
 *
 * Problema: el número de acta (= work.record_number, ej. "01-2026") se reutiliza en cada
 * municipio, pero `work_actas.acta_number` era único GLOBAL. Por eso una sola fila de acta
 * "01-2026" (con el código de contabilidad de Guacarí) se compartía con las obras de Circasia
 * y Quimbaya que tienen el mismo número, mostrándoles un código que no es suyo.
 *
 * Solución: la identidad del acta pasa a ser (company_id, acta_number).
 *   1. Agrega company_id.
 *   2. Backfill de las 6 actas existentes a su empresa real (ver tabla abajo).
 *   3. company_id NOT NULL.
 *   4. Quita el unique global sobre acta_number (nombre autogenerado → se busca dinámicamente).
 *   5. Agrega unique compuesto (company_id, acta_number) + FK a companies.
 */
export class ScopeActasByCompany1749000000000 implements MigrationInterface {
  name = 'ScopeActasByCompany1749000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Columna company_id (nullable temporalmente para poder backfillear).
    await queryRunner.query(`ALTER TABLE "work_actas" ADD COLUMN IF NOT EXISTS "company_id" int`);

    // 2) Backfill: cada acta existente a su empresa. Mapeo confirmado contra los datos:
    //    01-2026 → Guacarí(4) (código GR-, obra aprobada de Guacarí)
    //    02-2026 → Canales & Contactos(1) (la activa; El Cerrito crea la suya luego)
    //    02-2026 modernización → Jericó(14)
    //    04-2026 → Guacarí(4); 05-2026 → Guacarí(4); Prueba Daniel1 → Circasia(3)
    const backfill: Array<{ acta: string; companyId: number }> = [
      { acta: '01-2026', companyId: 4 },
      { acta: '02-2026', companyId: 1 },
      { acta: '02-2026 modernización', companyId: 14 },
      { acta: '04-2026', companyId: 4 },
      { acta: '05-2026', companyId: 4 },
      { acta: 'Prueba Daniel1', companyId: 3 },
    ];
    for (const { acta, companyId } of backfill) {
      await queryRunner.query(
        `UPDATE "work_actas" SET "company_id" = $1 WHERE "acta_number" = $2 AND "company_id" IS NULL`,
        [companyId, acta],
      );
    }

    // Red de seguridad: si quedó alguna acta sin mapear, asignarla a la empresa con más
    // obras que comparten ese record_number (dominante). Evita filas con company_id NULL.
    await queryRunner.query(`
      UPDATE "work_actas" a
      SET "company_id" = sub.company_id
      FROM (
        SELECT w.record_number, w.company_id,
               ROW_NUMBER() OVER (PARTITION BY w.record_number ORDER BY COUNT(*) DESC) AS rn
        FROM works w
        WHERE w.record_number IS NOT NULL
        GROUP BY w.record_number, w.company_id
      ) sub
      WHERE a."company_id" IS NULL AND sub.record_number = a."acta_number" AND sub.rn = 1
    `);

    // 3) company_id obligatorio.
    await queryRunner.query(`ALTER TABLE "work_actas" ALTER COLUMN "company_id" SET NOT NULL`);

    // 4) Quitar el unique global sobre acta_number (el nombre lo autogeneró TypeORM).
    await queryRunner.query(`
      DO $$
      DECLARE c text;
      BEGIN
        FOR c IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
          WHERE rel.relname = 'work_actas'
            AND con.contype = 'u'
            AND array_length(con.conkey, 1) = 1
            AND att.attname = 'acta_number'
        LOOP
          EXECUTE format('ALTER TABLE work_actas DROP CONSTRAINT %I', c);
        END LOOP;
      END $$;
    `);

    // 5) Unique compuesto (company_id, acta_number) + FK a companies.
    await queryRunner.query(`
      ALTER TABLE "work_actas"
      ADD CONSTRAINT "UQ_work_actas_company_acta" UNIQUE ("company_id", "acta_number")
    `);
    await queryRunner.query(`
      ALTER TABLE "work_actas"
      ADD CONSTRAINT "FK_work_actas_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "work_actas" DROP CONSTRAINT IF EXISTS "FK_work_actas_company"`);
    await queryRunner.query(`ALTER TABLE "work_actas" DROP CONSTRAINT IF EXISTS "UQ_work_actas_company_acta"`);
    // Restaurar unique global sobre acta_number (puede fallar si hay duplicados; aceptable en rollback).
    await queryRunner.query(`
      ALTER TABLE "work_actas"
      ADD CONSTRAINT "UQ_work_actas_acta_number" UNIQUE ("acta_number")
    `);
    await queryRunner.query(`ALTER TABLE "work_actas" DROP COLUMN IF EXISTS "company_id"`);
  }
}
