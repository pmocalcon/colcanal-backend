"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddObraFieldsToRequisitions1762520000000 = void 0;
class AddObraFieldsToRequisitions1762520000000 {
    name = 'AddObraFieldsToRequisitions1762520000000';
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      ADD COLUMN "obra" character varying(100),
      ADD COLUMN "codigo_obra" character varying(50)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "requisitions"
      DROP COLUMN "codigo_obra",
      DROP COLUMN "obra"
    `);
    }
}
exports.AddObraFieldsToRequisitions1762520000000 = AddObraFieldsToRequisitions1762520000000;
//# sourceMappingURL=1762520000000-AddObraFieldsToRequisitions.js.map