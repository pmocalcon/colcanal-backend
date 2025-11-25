import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryToRoles1762390207488 implements MigrationInterface {
  name = 'AddCategoryToRoles1762390207488';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna category a tabla roles
    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN "category" character varying(30)
    `);

    // Actualizar roles existentes con sus categorías
    // GERENCIA (1 rol)
    await queryRunner.query(`
      UPDATE "roles"
      SET "category" = 'GERENCIA'
      WHERE "nombre_rol" = 'Gerencia'
    `);

    // DIRECTOR_AREA (5 roles)
    await queryRunner.query(`
      UPDATE "roles"
      SET "category" = 'DIRECTOR_AREA'
      WHERE "nombre_rol" IN (
        'Director PMO',
        'Director Comercial',
        'Director Jurídico',
        'Director Técnico',
        'Director Financiero y Administrativo'
      )
    `);

    // DIRECTOR_PROYECTO (4 roles)
    await queryRunner.query(`
      UPDATE "roles"
      SET "category" = 'DIRECTOR_PROYECTO'
      WHERE "nombre_rol" IN (
        'Director de Proyecto Antioquia',
        'Director de Proyecto Quindío',
        'Director de Proyecto Valle',
        'Director de Proyecto Putumayo'
      )
    `);

    // ANALISTA (4 roles)
    await queryRunner.query(`
      UPDATE "roles"
      SET "category" = 'ANALISTA'
      WHERE "nombre_rol" IN (
        'Analista PMO',
        'Analista Comercial',
        'Analista Jurídico',
        'Analista Administrativo'
      )
    `);

    // COORDINADOR (2 roles)
    await queryRunner.query(`
      UPDATE "roles"
      SET "category" = 'COORDINADOR'
      WHERE "nombre_rol" IN (
        'Coordinador Financiero',
        'Coordinador Jurídico'
      )
    `);

    // PQRS (10 roles)
    await queryRunner.query(`
      UPDATE "roles"
      SET "category" = 'PQRS'
      WHERE "nombre_rol" IN (
        'PQRS El Cerrito',
        'PQRS Guacarí',
        'PQRS Circasia',
        'PQRS Quimbaya',
        'PQRS Jericó',
        'PQRS Ciudad Bolívar',
        'PQRS Tarso',
        'PQRS Pueblo Rico',
        'PQRS Santa Bárbara',
        'PQRS Puerto Asís'
      )
    `);

    // COMPRAS (1 rol)
    await queryRunner.query(`
      UPDATE "roles"
      SET "category" = 'COMPRAS'
      WHERE "nombre_rol" = 'Compras'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar columna category
    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN "category"
    `);
  }
}
