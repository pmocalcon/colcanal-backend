import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDirectorBudgets1746700000000 implements MigrationInterface {
  name = 'AddDirectorBudgets1746700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS director_budgets (
        budget_id       SERIAL PRIMARY KEY,
        work_id         INT REFERENCES works(work_id) ON DELETE SET NULL,
        department_name VARCHAR(100),
        work_name       VARCHAR(255),
        observaciones   TEXT,
        mano_de_obra          NUMERIC(15,2),
        mano_de_obra_ej       NUMERIC(15,2),
        materiales_inventario    NUMERIC(15,2),
        materiales_inventario_ej NUMERIC(15,2),
        valor_facturado          NUMERIC(15,2),
        valor_facturado_ej       NUMERIC(15,2),
        otros_costos             NUMERIC(15,2),
        otros_costos_ej          NUMERIC(15,2),
        leg                      NUMERIC(15,2),
        leg_ej                   NUMERIC(15,2),
        ret_pct                  NUMERIC(5,2),
        ret_pct_ej               NUMERIC(5,2),
        status        VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_by    INT NOT NULL REFERENCES users(user_id),
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS director_budget_items (
        item_id         SERIAL PRIMARY KEY,
        budget_id       INT NOT NULL REFERENCES director_budgets(budget_id) ON DELETE CASCADE,
        item_order      INT NOT NULL DEFAULT 0,
        material_id     INT REFERENCES materials(material_id) ON DELETE SET NULL,
        codigo          VARCHAR(50),
        descripcion     TEXT,
        cantidad        NUMERIC(15,4),
        vr_unitario     NUMERIC(15,2),
        cant_bodega     NUMERIC(15,4),
        costo_transporte NUMERIC(15,2),
        ejecutado       NUMERIC(15,2)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_director_budgets_work ON director_budgets(work_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_director_budgets_created_by ON director_budgets(created_by);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_director_budget_items_budget ON director_budget_items(budget_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS director_budget_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS director_budgets;`);
  }
}
