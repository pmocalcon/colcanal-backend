"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddMissingIndexes1762510000000 = void 0;
class AddMissingIndexes1762510000000 {
    name = 'AddMissingIndexes1762510000000';
    async up(queryRunner) {
        console.log('Creando índices faltantes para optimizar consultas...');
        await queryRunner.query(`
      CREATE INDEX "IDX_requisitions_status_id"
      ON "requisitions" ("status_id")
    `);
        console.log('✅ Índice creado: requisitions.status_id');
        await queryRunner.query(`
      CREATE INDEX "IDX_requisitions_created_by"
      ON "requisitions" ("created_by")
    `);
        console.log('✅ Índice creado: requisitions.created_by');
        await queryRunner.query(`
      CREATE INDEX "IDX_requisition_items_requisition_id"
      ON "requisition_items" ("requisition_id")
    `);
        console.log('✅ Índice creado: requisition_items.requisition_id');
        await queryRunner.query(`
      CREATE INDEX "IDX_requisitions_created_by_status_id"
      ON "requisitions" ("created_by", "status_id")
    `);
        console.log('✅ Índice compuesto creado: requisitions(created_by, status_id)');
        await queryRunner.query(`
      CREATE INDEX "IDX_requisitions_created_at"
      ON "requisitions" ("created_at")
    `);
        console.log('✅ Índice creado: requisitions.created_at');
        await queryRunner.query(`
      CREATE INDEX "IDX_requisition_items_material_id"
      ON "requisition_items" ("material_id")
    `);
        console.log('✅ Índice creado: requisition_items.material_id');
        await queryRunner.query(`
      CREATE INDEX "IDX_requisition_item_quotations_item_id"
      ON "requisition_item_quotations" ("requisition_item_id")
    `);
        console.log('✅ Índice creado: requisition_item_quotations.requisition_item_id');
        await queryRunner.query(`
      CREATE INDEX "IDX_requisition_item_quotations_supplier_id"
      ON "requisition_item_quotations" ("supplier_id")
    `);
        console.log('✅ Índice creado: requisition_item_quotations.supplier_id');
        await queryRunner.query(`
      CREATE INDEX "IDX_purchase_orders_requisition_id"
      ON "purchase_orders" ("requisition_id")
    `);
        console.log('✅ Índice creado: purchase_orders.requisition_id');
        await queryRunner.query(`
      CREATE INDEX "IDX_purchase_orders_supplier_id"
      ON "purchase_orders" ("supplier_id")
    `);
        console.log('✅ Índice creado: purchase_orders.supplier_id');
        await queryRunner.query(`
      CREATE INDEX "IDX_requisitions_operation_center_id"
      ON "requisitions" ("operation_center_id")
    `);
        console.log('✅ Índice creado: requisitions.operation_center_id');
        await queryRunner.query(`
      CREATE INDEX "IDX_requisitions_company_id"
      ON "requisitions" ("company_id")
    `);
        console.log('✅ Índice creado: requisitions.company_id');
        console.log('\n🎉 Todos los índices han sido creados exitosamente!');
        console.log('📊 Impacto esperado: Mejora de rendimiento 50-150x en consultas principales');
    }
    async down(queryRunner) {
        console.log('Eliminando índices...');
        await queryRunner.query(`DROP INDEX "IDX_requisitions_company_id"`);
        console.log('❌ Índice eliminado: requisitions.company_id');
        await queryRunner.query(`DROP INDEX "IDX_requisitions_operation_center_id"`);
        console.log('❌ Índice eliminado: requisitions.operation_center_id');
        await queryRunner.query(`DROP INDEX "IDX_purchase_orders_supplier_id"`);
        console.log('❌ Índice eliminado: purchase_orders.supplier_id');
        await queryRunner.query(`DROP INDEX "IDX_purchase_orders_requisition_id"`);
        console.log('❌ Índice eliminado: purchase_orders.requisition_id');
        await queryRunner.query(`DROP INDEX "IDX_requisition_item_quotations_supplier_id"`);
        console.log('❌ Índice eliminado: requisition_item_quotations.supplier_id');
        await queryRunner.query(`DROP INDEX "IDX_requisition_item_quotations_item_id"`);
        console.log('❌ Índice eliminado: requisition_item_quotations.requisition_item_id');
        await queryRunner.query(`DROP INDEX "IDX_requisition_items_material_id"`);
        console.log('❌ Índice eliminado: requisition_items.material_id');
        await queryRunner.query(`DROP INDEX "IDX_requisitions_created_at"`);
        console.log('❌ Índice eliminado: requisitions.created_at');
        await queryRunner.query(`DROP INDEX "IDX_requisitions_created_by_status_id"`);
        console.log('❌ Índice compuesto eliminado: requisitions(created_by, status_id)');
        await queryRunner.query(`DROP INDEX "IDX_requisition_items_requisition_id"`);
        console.log('❌ Índice eliminado: requisition_items.requisition_id');
        await queryRunner.query(`DROP INDEX "IDX_requisitions_created_by"`);
        console.log('❌ Índice eliminado: requisitions.created_by');
        await queryRunner.query(`DROP INDEX "IDX_requisitions_status_id"`);
        console.log('❌ Índice eliminado: requisitions.status_id');
        console.log('\n✅ Todos los índices han sido eliminados');
    }
}
exports.AddMissingIndexes1762510000000 = AddMissingIndexes1762510000000;
//# sourceMappingURL=1762510000000-AddMissingIndexes.js.map