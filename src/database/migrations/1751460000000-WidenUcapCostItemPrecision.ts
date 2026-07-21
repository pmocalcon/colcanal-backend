import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Amplía la precisión de las líneas de costo de las UCAPs.
 *
 * Las cantidades del APU son fracciones (1/15 = 0,0666…, 1/30 = 0,0333…) y los
 * precios traen centavos (1.701,7). Con quantity a 3 decimales y unit_price a 2
 * esas cifras se truncaban al importar, y el total de la UCAP salía 1-2 pesos
 * por debajo del Excel. Al ampliar y recargar las líneas exactas, el cálculo
 * (suma exacta + redondeo final) reproduce el Excel al peso.
 */
export class WidenUcapCostItemPrecision1751460000000 implements MigrationInterface {
  name = 'WidenUcapCostItemPrecision1751460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ucap_cost_items ALTER COLUMN quantity TYPE numeric(14, 8)`,
    );
    await queryRunner.query(
      `ALTER TABLE ucap_cost_items ALTER COLUMN unit_price TYPE numeric(15, 4)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Volver a 3/2 decimales trunca datos; se hace solo por simetría del rollback.
    await queryRunner.query(
      `ALTER TABLE ucap_cost_items ALTER COLUMN quantity TYPE numeric(12, 3)`,
    );
    await queryRunner.query(
      `ALTER TABLE ucap_cost_items ALTER COLUMN unit_price TYPE numeric(15, 2)`,
    );
  }
}
