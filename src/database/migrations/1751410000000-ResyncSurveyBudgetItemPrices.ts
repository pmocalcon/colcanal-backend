import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Resincroniza el precio congelado de los items de presupuesto con el valor
 * VIGENTE de su UCAP.
 *
 * PROBLEMA
 * `survey_budget_items.unit_value` es una foto del precio al crear el
 * levantamiento (surveys.service: `unitValue: ucap.roundedValue`). En Puerto Asis
 * se recalcularon las hojas de costos CREG, y ademas cambio el significado del
 * valor de la UCAP: antes incluia el factor IPP y ahora es el total con
 * indirectos SIN IPP. Las fotos viejas quedaron con un IPP incorporado.
 *
 * Como el valor de obra se calcula
 *     valor = SUM(unit_value * quantity) * (previous_month_ipp / ipp_initial_value)
 * (ver getWorksValue), esas fotos aplican el IPP DOS VECES e inflan la obra
 * (~37% en los casos detectados: 3.117.580 vs 2.270.245 = factor 1,3732).
 *
 * QUE HACE
 * Deja `unit_value` = valor actual de la UCAP y recalcula `budgeted_value`.
 * Solo toca las filas que difieren, asi que es idempotente.
 *
 * ALCANCE: SOLO Puerto Asis (decision de negocio). Guacari tambien presenta
 * desfase (3 items / 3 levantamientos, -$422.536) pero se revisa aparte, asi
 * que queda intacto a proposito.
 *
 * Medido en prod antes de aplicar: 44 items en 31 levantamientos,
 * presupuestado 845.537.761 -> 722.072.309 (-123.465.452).
 *
 * REVERSIBLE
 * Antes de actualizar respalda los valores viejos en
 * `survey_budget_items_price_backup`; `down()` los restaura.
 *
 * OJO: cambia el total de presupuestos ya aprobados (esa es justamente la
 * correccion). Produccion corre con synchronize:true -> ejecutar esta migracion
 * ANTES de arrancar el backend nuevo.
 */
export class ResyncSurveyBudgetItemPrices1751410000000
  implements MigrationInterface
{
  name = 'ResyncSurveyBudgetItemPrices1751410000000';

  private static readonly BACKUP_TABLE = 'survey_budget_items_price_backup';

  /** Municipio al que se limita el resync (nombre de la empresa o del proyecto). */
  private static readonly MUNICIPIO = 'Unión Temporal Alumbrado Público Puerto Asís';

  /**
   * Items del municipio objetivo. El municipio de un levantamiento es su
   * proyecto si lo tiene (caso Canales & Contactos) y si no, su empresa.
   */
  private static readonly ITEMS_DEL_MUNICIPIO = `
    SELECT sbi2.item_id
    FROM survey_budget_items sbi2
    JOIN surveys s ON s.survey_id = sbi2.survey_id
    JOIN works w   ON w.work_id = s.work_id
    LEFT JOIN projects p  ON p.project_id = w.project_id
    LEFT JOIN companies c ON c.company_id = w.company_id
    WHERE COALESCE(p.name, c.name) = CAST($1 AS varchar)
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const backup = ResyncSurveyBudgetItemPrices1751410000000.BACKUP_TABLE;

    // 1. Tabla de respaldo (guarda el antes y el despues de cada fila tocada).
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS ${backup} (
         backup_id          serial PRIMARY KEY,
         item_id            int NOT NULL,
         survey_id          int,
         ucap_id            int,
         old_unit_value     numeric(15,2),
         old_budgeted_value numeric(15,2),
         old_initial_ipp    numeric(10,2),
         new_unit_value     numeric(15,2),
         new_budgeted_value numeric(15,2),
         new_initial_ipp    numeric(10,2),
         backed_up_at       timestamptz NOT NULL DEFAULT now()
       )`,
    );

    const municipio = ResyncSurveyBudgetItemPrices1751410000000.MUNICIPIO;
    const delMunicipio =
      ResyncSurveyBudgetItemPrices1751410000000.ITEMS_DEL_MUNICIPIO;

    // 2. Respaldar SOLO las filas del municipio cuyo precio difiere del de su UCAP.
    await queryRunner.query(
      `INSERT INTO ${backup} (
         item_id, survey_id, ucap_id,
         old_unit_value, old_budgeted_value, old_initial_ipp,
         new_unit_value, new_budgeted_value, new_initial_ipp
       )
       SELECT sbi.item_id, sbi.survey_id, sbi.ucap_id,
              sbi.unit_value, sbi.budgeted_value, sbi.initial_ipp,
              u.rounded_value,
              ROUND(sbi.quantity * u.rounded_value, 2),
              u.initial_ipp
       FROM survey_budget_items sbi
       JOIN ucaps u ON u.ucap_id = sbi.ucap_id
       WHERE sbi.unit_value IS DISTINCT FROM u.rounded_value
         AND sbi.item_id IN (${delMunicipio})
         AND NOT EXISTS (
           SELECT 1 FROM ${backup} b WHERE b.item_id = sbi.item_id
         )`,
      [municipio],
    );

    // 3. Aplicar el valor vigente y recalcular el presupuestado.
    await queryRunner.query(
      `UPDATE survey_budget_items sbi
       SET unit_value     = u.rounded_value,
           budgeted_value = ROUND(sbi.quantity * u.rounded_value, 2),
           initial_ipp    = u.initial_ipp
       FROM ucaps u
       WHERE u.ucap_id = sbi.ucap_id
         AND sbi.unit_value IS DISTINCT FROM u.rounded_value
         AND sbi.item_id IN (${delMunicipio})`,
      [municipio],
    );

    // El resumen se lee del respaldo: es el registro fiel de lo que se toco
    // (el resultado de un UPDATE no trae un conteo confiable via queryRunner).
    const resumen = await queryRunner.query(
      `SELECT COUNT(*)::int AS items,
              COUNT(DISTINCT survey_id)::int AS levantamientos,
              COALESCE(SUM(old_budgeted_value - new_budgeted_value), 0)::float AS diferencia
       FROM ${backup}`,
    );
    console.log(
      `[ResyncSurveyBudgetItemPrices] ${resumen[0]?.items ?? 0} item(s) en ` +
        `${resumen[0]?.levantamientos ?? 0} levantamiento(s). ` +
        `Diferencia presupuestada: ${resumen[0]?.diferencia ?? 0}. ` +
        `Respaldo en ${backup} (down() lo restaura).`,
    );
  }

  /** Restaura los valores previos desde el respaldo y elimina la tabla. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const backup = ResyncSurveyBudgetItemPrices1751410000000.BACKUP_TABLE;

    const exists = await queryRunner.query(
      `SELECT to_regclass(CAST($1 AS text)) IS NOT NULL AS existe`,
      [backup],
    );
    if (!exists[0]?.existe) return;

    await queryRunner.query(
      `UPDATE survey_budget_items sbi
       SET unit_value     = b.old_unit_value,
           budgeted_value = b.old_budgeted_value,
           initial_ipp    = b.old_initial_ipp
       FROM ${backup} b
       WHERE b.item_id = sbi.item_id`,
    );
    await queryRunner.query(`DROP TABLE ${backup}`);
  }
}
