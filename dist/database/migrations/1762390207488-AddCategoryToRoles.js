"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCategoryToRoles1762390207488 = void 0;
class AddCategoryToRoles1762390207488 {
    name = 'AddCategoryToRoles1762390207488';
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN "category" character varying(30)
    `);
        await queryRunner.query(`
      UPDATE "roles"
      SET "category" = 'GERENCIA'
      WHERE "nombre_rol" = 'Gerencia'
    `);
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
        await queryRunner.query(`
      UPDATE "roles"
      SET "category" = 'COORDINADOR'
      WHERE "nombre_rol" IN (
        'Coordinador Financiero',
        'Coordinador Jurídico'
      )
    `);
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
        await queryRunner.query(`
      UPDATE "roles"
      SET "category" = 'COMPRAS'
      WHERE "nombre_rol" = 'Compras'
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN "category"
    `);
    }
}
exports.AddCategoryToRoles1762390207488 = AddCategoryToRoles1762390207488;
//# sourceMappingURL=1762390207488-AddCategoryToRoles.js.map