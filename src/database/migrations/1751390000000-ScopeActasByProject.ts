import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Scoping de actas por PROYECTO además de por empresa.
 *
 * Antes: la identidad del acta era (empresa, número). En Canales & Contactos el
 * municipio es el proyecto, así que un mismo número de acta en municipios distintos
 * (Pueblorrico, Tarso, ...) colapsaba en una sola acta y se mezclaban proyectos.
 *
 * Ahora: identidad (empresa, proyecto, número). Cada acta compartida se DIVIDE en
 * una fila por proyecto, copiando su estado (técnico, presupuesto, cronograma, etc.).
 *
 * Idempotente y tolerante: en prod (synchronize:true) el backend pudo haber agregado
 * ya la columna project_id y el unique de 3 columnas; esta migración se encarga
 * únicamente del BACKFILL + SPLIT de datos y ajusta el unique sólo si falta.
 */
export class ScopeActasByProject1751390000000 implements MigrationInterface {
  name = 'ScopeActasByProject1751390000000';

  // Columnas a copiar al dividir un acta (todas menos el id serial).
  private static readonly WORK_ACTA_COLS = [
    'company_id',
    'acta_number',
    'status',
    'presupuesto_status',
    'presupuesto_rechazo_motivo',
    'cronograma_status',
    'cronograma_rechazo_motivo',
    'cronograma_reviewed_by',
    'cronograma_reviewed_at',
    'project_code',
    'created_by',
    'reviewed_by',
    'reviewed_at',
    'approved_by',
    'approved_at',
    'rejection_comment',
    'created_at',
    'updated_at',
  ];

  private static readonly DRAFT_COLS = [
    'company_id',
    'acta_number',
    'payload',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.scopeTable(queryRunner, 'work_actas', 'acta_id', ScopeActasByProject1751390000000.WORK_ACTA_COLS, 'UQ_work_actas_company_project_acta');
    await this.scopeTable(queryRunner, 'acta_summary_drafts', 'summary_id', ScopeActasByProject1751390000000.DRAFT_COLS, 'UQ_acta_summary_drafts_company_project_acta');
  }

  /**
   * Aplica el scoping por proyecto a una tabla ligada al acta:
   * agrega columna, backfillea el proyecto, divide las actas compartidas y ajusta el unique.
   */
  private async scopeTable(
    queryRunner: QueryRunner,
    table: string,
    idCol: string,
    copyCols: string[],
    uniqueName: string,
  ): Promise<void> {
    // 1. Columna project_id (nullable, aditiva). No-op si ya existe.
    await queryRunner.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS project_id int`);

    // 2. Alinear la secuencia por si va atrás (se insertarán filas nuevas).
    await queryRunner.query(
      `SELECT setval(
         pg_get_serial_sequence('${table}', '${idCol}'),
         (SELECT COALESCE(MAX(${idCol}), 1) FROM ${table})
       )`,
    );

    // 3. Backfill: cada fila toma el proyecto MÍNIMO de las obras de su acta.
    //    (MIN ignora NULL: empresas sin proyecto quedan en NULL.) Sólo filas aún sin proyecto.
    await queryRunner.query(
      `UPDATE ${table} a
       SET project_id = sub.min_pid
       FROM (
         SELECT company_id, record_number, MIN(project_id) AS min_pid
         FROM works
         WHERE record_number IS NOT NULL AND record_number <> ''
         GROUP BY company_id, record_number
       ) sub
       WHERE a.company_id = sub.company_id
         AND a.acta_number = sub.record_number
         AND a.project_id IS NULL`,
    );

    // 4. Dividir: por cada proyecto ADICIONAL de las obras (distinto del asignado),
    //    insertar una copia de la fila con ese project_id.
    const cols = copyCols.join(', ');
    const selCols = copyCols.map((c) => `a.${c}`).join(', ');
    await queryRunner.query(
      `INSERT INTO ${table} (${cols}, project_id)
       SELECT ${selCols}, wp.project_id
       FROM ${table} a
       JOIN (
         SELECT DISTINCT company_id, record_number, project_id
         FROM works
         WHERE record_number IS NOT NULL AND record_number <> '' AND project_id IS NOT NULL
       ) wp
         ON wp.company_id = a.company_id
        AND wp.record_number = a.acta_number
       WHERE a.project_id IS DISTINCT FROM wp.project_id`,
    );

    // 5. Ajustar el unique: eliminar el viejo de 2 columnas (si existe) y crear el de 3
    //    (sólo si no existe ya uno equivalente; synchronize pudo haberlo creado).
    await this.dropUnique(queryRunner, table, ['acta_number', 'company_id']);
    const hasComposite = await this.hasUnique(queryRunner, table, ['acta_number', 'company_id', 'project_id']);
    if (!hasComposite) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD CONSTRAINT "${uniqueName}" UNIQUE (company_id, project_id, acta_number)`,
      );
    }
  }

  /** Nombres de constraints unique de `table` cuyas columnas son exactamente `cols` (ordenadas). */
  private async findUniques(queryRunner: QueryRunner, table: string, cols: string[]): Promise<string[]> {
    const sorted = [...cols].sort();
    const rows: Array<{ conname: string }> = await queryRunner.query(
      `SELECT con.conname
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       WHERE rel.relname = $1 AND con.contype = 'u'
         AND (
           SELECT array_agg(att.attname::text ORDER BY att.attname)
           FROM unnest(con.conkey) AS k(attnum)
           JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
         ) = $2::text[]`,
      [table, sorted],
    );
    return rows.map((r) => r.conname);
  }

  private async hasUnique(queryRunner: QueryRunner, table: string, cols: string[]): Promise<boolean> {
    return (await this.findUniques(queryRunner, table, cols)).length > 0;
  }

  private async dropUnique(queryRunner: QueryRunner, table: string, cols: string[]): Promise<void> {
    for (const name of await this.findUniques(queryRunner, table, cols)) {
      await queryRunner.query(`ALTER TABLE ${table} DROP CONSTRAINT "${name}"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, idCol] of [
      ['work_actas', 'acta_id'],
      ['acta_summary_drafts', 'summary_id'],
    ] as const) {
      await this.dropUnique(queryRunner, table, ['acta_number', 'company_id', 'project_id']);
      // Colapsar filas divididas: conservar la de menor id por (empresa, número).
      await queryRunner.query(
        `DELETE FROM ${table} a USING ${table} b
         WHERE a.company_id = b.company_id
           AND a.acta_number = b.acta_number
           AND a.${idCol} > b.${idCol}`,
      );
      await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS project_id`);
      await queryRunner.query(
        `ALTER TABLE ${table} ADD CONSTRAINT "UQ_${table}_company_acta" UNIQUE (company_id, acta_number)`,
      );
    }
  }
}
