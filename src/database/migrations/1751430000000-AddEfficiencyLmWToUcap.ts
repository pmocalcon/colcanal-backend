import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Eficiencia luminosa [Lm/W] por UCAP.
 *
 * La liquidacion escala la anualidad de inversion por (eficiencia / 130):
 *   CINV anual = (PAGO(r, Vi, -valorInversion) * eficiencia/130
 *                 + PAGO(r, vidaUtil, -valorTotal) * ne) * IDapagadas
 *
 * No puede salir de Parametros ni del grupo: dentro de LUMINARIAS conviven
 * sodio (130) y LED (160), asi que es un dato de cada UCAP.
 *
 * Nullable a proposito: las UCAPs existentes quedan sin eficiencia y la
 * liquidacion las deja en 0 hasta que se capture, en vez de inventar un valor.
 */
export class AddEfficiencyLmWToUcap1751430000000 implements MigrationInterface {
  name = 'AddEfficiencyLmWToUcap1751430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ucaps ADD COLUMN IF NOT EXISTS efficiency_lm_w integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ucaps DROP COLUMN IF EXISTS efficiency_lm_w`,
    );
  }
}
