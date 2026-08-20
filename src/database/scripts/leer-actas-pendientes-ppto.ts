/* SOLO LECTURA */
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

// Copia literal de la consulta que quedó en getActasPendingBudget, para comprobar
// contra los datos reales que devuelve lo que debe.
const norm = (col: string) =>
  `translate(lower(regexp_replace(coalesce(${col}, ''), '^\\s*uni.n temporal alumbrado p.blico\\s+', '', 'i')), 'áéíóúñ', 'aeioun')`;

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as any);
  await ds.initialize();

  const rows = await ds.query(
    `
    SELECT
      a.company_id  AS "companyId",
      a.project_id  AS "projectId",
      a.acta_number AS "actaNumber",
      c.name        AS "companyName",
      a.updated_at  AS "updatedAt",
      (SELECT COUNT(*)::int
         FROM works w
        WHERE w.company_id = a.company_id
          AND w.project_id IS NOT DISTINCT FROM a.project_id
          AND w.record_number = a.acta_number) AS "worksCount"
    FROM work_actas a
    LEFT JOIN companies c ON c.company_id = a.company_id
    LEFT JOIN projects  p ON p.project_id = a.project_id
    WHERE a.presupuesto_status = $1
      AND NOT EXISTS (
        SELECT 1
        FROM director_budgets db
        WHERE (
                db.acta_company_id = a.company_id
                AND db.acta_project_id IS NOT DISTINCT FROM a.project_id
                AND db.acta_number = a.acta_number
              )
           OR (
                db.acta_company_id IS NULL
                AND db.work_name = a.acta_number
                AND db.company_name IS NOT NULL
                AND ${norm('db.company_name')} = ${norm('COALESCE(p.name, c.name)')}
              )
      )
    ORDER BY a.updated_at DESC
    `,
    ['en_revision'],
  );

  console.log('=== Bandeja "Actas pendientes de presupuesto" ===');
  console.table(rows);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
