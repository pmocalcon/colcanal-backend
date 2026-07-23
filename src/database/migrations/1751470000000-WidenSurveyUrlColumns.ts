import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Amplía sketch_url y map_url de varchar(500) a text.
 *
 * Los enlaces para compartir de SharePoint pasan de 500 caracteres: además de la
 * ruta llevan el id del documento y los parámetros de compartir
 * (?d=w...&csf=1&web=1&e=...). Al guardar un levantamiento con uno de esos
 * enlaces fallaba la validación y la obra quedaba creada sin su levantamiento.
 */
export class WidenSurveyUrlColumns1751470000000 implements MigrationInterface {
  name = "WidenSurveyUrlColumns1751470000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE surveys ALTER COLUMN sketch_url TYPE text`,
    );
    await queryRunner.query(
      `ALTER TABLE surveys ALTER COLUMN map_url TYPE text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Trunca lo que exceda el límite anterior: sin esto el ALTER falla si ya hay
    // enlaces largos guardados.
    await queryRunner.query(
      `UPDATE surveys SET sketch_url = LEFT(sketch_url, 500) WHERE LENGTH(sketch_url) > 500`,
    );
    await queryRunner.query(
      `UPDATE surveys SET map_url = LEFT(map_url, 500) WHERE LENGTH(map_url) > 500`,
    );
    await queryRunner.query(
      `ALTER TABLE surveys ALTER COLUMN sketch_url TYPE varchar(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE surveys ALTER COLUMN map_url TYPE varchar(500)`,
    );
  }
}
