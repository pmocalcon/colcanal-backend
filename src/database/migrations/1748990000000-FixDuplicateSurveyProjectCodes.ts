import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repara los `project_code` duplicados de los levantamientos (columna "N° Levantamiento"
 * en la UI) y blinda la columna para que nunca vuelva a haber duplicados.
 *
 * Contexto del bug:
 *   `generateProjectCode()` calculaba la secuencia con COUNT(*) + 1 de los levantamientos
 *   existentes. Si se borraba un levantamiento intermedio, el conteo bajaba y el siguiente
 *   levantamiento reutilizaba un número ya usado -> dos `CB-000126`. Como no había restricción
 *   UNIQUE, la base de datos lo aceptaba en silencio. La lógica de generación ya se cambió a
 *   MAX(secuencia) + 1, que es monotónica y nunca reutiliza un número borrado.
 *
 * Qué hace esta migración:
 *   1. Renumera los duplicados: por cada `project_code` repetido conserva el levantamiento
 *      creado primero (created_at, luego survey_id como desempate) y reasigna a las copias
 *      sobrantes el MENOR número libre dentro de su abreviatura+año (rellena primero los huecos
 *      de la secuencia y, si se agotan, continúa después del máximo).
 *      Con los datos actuales: "Calle 6 Villa Manuela" (más antiguo, el de más abajo en la lista)
 *      conserva CB-000126 y "Recta Farallones" pasa a CB-001126, que es el número que faltaba;
 *      así la secuencia queda continua de 0001 a 0030, sin huecos ni duplicados.
 *   2. Crea un índice UNIQUE sobre `project_code` para que la base de datos rechace cualquier
 *      duplicado futuro (cubre incluso la carrera por creación concurrente).
 *
 * Nota: el renumerado no es reversible (no se guardan los valores anteriores); el down()
 * solo elimina el índice UNIQUE.
 */
export class FixDuplicateSurveyProjectCodes1748990000000
  implements MigrationInterface
{
  name = 'FixDuplicateSurveyProjectCodes1748990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Renumerar duplicados, conservando el más antiguo de cada grupo y asignando a las
    //    copias sobrantes el MENOR número libre (primero rellena huecos de la secuencia).
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          survey_id,
          SPLIT_PART(project_code, '-', 1) AS abbr,
          RIGHT(project_code, 2)           AS yr,
          CAST(SUBSTRING(SPLIT_PART(project_code, '-', 2) FROM 1 FOR 4) AS INTEGER) AS seq,
          ROW_NUMBER() OVER (
            PARTITION BY project_code
            ORDER BY created_at ASC, survey_id ASC
          ) AS copy_rank
        FROM surveys
        WHERE project_code ~ '^[A-Za-z]+-[0-9]{6}$'
      ),
      -- Copias sobrantes (todo lo que no es la primera de cada código) que hay que renumerar.
      surplus AS (
        SELECT
          survey_id,
          abbr,
          yr,
          ROW_NUMBER() OVER (PARTITION BY abbr, yr ORDER BY survey_id ASC) AS need_rank
        FROM ranked
        WHERE copy_rank > 1
      ),
      surplus_counts AS (
        SELECT abbr, yr, COUNT(*) AS n FROM surplus GROUP BY abbr, yr
      ),
      -- Secuencias ya ocupadas y máximo, por grupo abreviatura+año.
      used AS (
        SELECT DISTINCT abbr, yr, seq FROM ranked
      ),
      maxes AS (
        SELECT abbr, yr, MAX(seq) AS max_seq FROM ranked GROUP BY abbr, yr
      ),
      -- Números libres en orden ascendente: 1..(max+n) menos los ya usados. Así primero se
      -- rellenan los huecos y, si no alcanzan, se continúa después del máximo.
      free_slots AS (
        SELECT
          m.abbr,
          m.yr,
          gs.s AS seq,
          ROW_NUMBER() OVER (PARTITION BY m.abbr, m.yr ORDER BY gs.s ASC) AS slot_rank
        FROM maxes m
        JOIN surplus_counts sc ON sc.abbr = m.abbr AND sc.yr = m.yr
        CROSS JOIN LATERAL generate_series(1, m.max_seq + sc.n) AS gs(s)
        WHERE NOT EXISTS (
          SELECT 1 FROM used u
          WHERE u.abbr = m.abbr AND u.yr = m.yr AND u.seq = gs.s
        )
      )
      UPDATE surveys s
      SET project_code = sp.abbr || '-' || LPAD(fs.seq::text, 4, '0') || sp.yr
      FROM surplus sp
      JOIN free_slots fs
        ON fs.abbr = sp.abbr AND fs.yr = sp.yr AND fs.slot_rank = sp.need_rank
      WHERE s.survey_id = sp.survey_id
    `);

    // 2) Blindar con índice UNIQUE para impedir duplicados a nivel de base de datos.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_surveys_project_code"
      ON surveys (project_code)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // El renumerado de datos no se puede revertir; solo se elimina el índice UNIQUE.
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_surveys_project_code"`);
  }
}
