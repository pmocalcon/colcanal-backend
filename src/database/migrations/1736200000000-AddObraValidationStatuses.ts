import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: AddObraValidationStatuses
 *
 * Esta migración agrega dos nuevos estados de requisición para soportar
 * el flujo de validación de obras:
 *
 * - pendiente_validacion: Estado inicial para requisiciones creadas por PQRS
 *   o Coordinador Operativo cuando tienen campo "obra" diligenciado.
 *   El Director de Proyecto asignado debe validar antes de que pase a revisión.
 *
 * - rechazada_validador: Cuando el Director de Proyecto rechaza la validación
 *   y devuelve la requisición al solicitante.
 *
 * Flujo con Obra:
 * PQRS/Coord.Operativo crea (con Obra) → pendiente_validacion
 *   → Director de Proyecto VALIDA → pendiente (Director Técnico revisa)
 *   → Director Técnico REVISA → pendiente_autorizacion
 *   → Gerencia de Proyectos AUTORIZA → autorizado
 *   → Gerencia APRUEBA → aprobada_gerencia
 *
 * O si rechaza el validador:
 * pendiente_validacion → rechazada_validador → (usuario edita y reenvía)
 */
export class AddObraValidationStatuses1736200000000 implements MigrationInterface {
    name = 'AddObraValidationStatuses1736200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Verificar si los estados ya existen (para evitar errores en re-ejecución)
        const existingValidation = await queryRunner.query(
            `SELECT status_id FROM requisition_statuses WHERE code = 'pendiente_validacion'`
        );

        if (existingValidation.length > 0) {
            console.log('⚠️ Estados de validación de obra ya existen, saltando...');
            return;
        }

        // 2. Incrementar el orden de todos los estados actuales para hacer espacio
        // Los nuevos estados irán en order 1 y 9 (después de rechazada_revisor)
        console.log('📝 Ajustando orden de estados existentes...');

        // Incrementar order de todos los estados >= 1 para hacer espacio para pendiente_validacion
        await queryRunner.query(`
            UPDATE requisition_statuses
            SET "order" = "order" + 1
            WHERE "order" >= 1
        `);

        // 3. Insertar el estado pendiente_validacion con order 1
        console.log('📝 Insertando estado: pendiente_validacion');
        await queryRunner.query(`
            INSERT INTO requisition_statuses (code, name, description, color, "order")
            VALUES (
                'pendiente_validacion',
                'Pendiente de validación',
                'Esperando validación por Director de Proyecto antes de revisión',
                'indigo',
                1
            )
        `);

        // 4. Encontrar el order actual de rechazada_revisor para insertar rechazada_validador después
        const rechazadaRevisor = await queryRunner.query(
            `SELECT "order" FROM requisition_statuses WHERE code = 'rechazada_revisor'`
        );

        const rechazadaRevisorOrder = rechazadaRevisor[0]?.order || 9;

        // 5. Incrementar order de estados >= rechazada_revisor+1 para hacer espacio
        await queryRunner.query(`
            UPDATE requisition_statuses
            SET "order" = "order" + 1
            WHERE "order" > ${rechazadaRevisorOrder}
        `);

        // 6. Insertar el estado rechazada_validador después de rechazada_revisor
        console.log('📝 Insertando estado: rechazada_validador');
        await queryRunner.query(`
            INSERT INTO requisition_statuses (code, name, description, color, "order")
            VALUES (
                'rechazada_validador',
                'Rechazada por validador',
                'Devuelta al solicitante por Director de Proyecto en validación',
                'pink',
                ${rechazadaRevisorOrder + 1}
            )
        `);

        console.log('✅ Estados de validación de obra creados exitosamente');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Verificar si hay requisiciones usando estos estados
        const requisitionsWithValidation = await queryRunner.query(`
            SELECT COUNT(*) as count FROM requisitions r
            JOIN requisition_statuses rs ON r.status_id = rs.status_id
            WHERE rs.code IN ('pendiente_validacion', 'rechazada_validador')
        `);

        if (parseInt(requisitionsWithValidation[0].count) > 0) {
            console.log('⚠️ Hay requisiciones usando los estados de validación. Actualizando a pendiente...');

            // Obtener el ID del estado pendiente
            const pendienteStatus = await queryRunner.query(
                `SELECT status_id FROM requisition_statuses WHERE code = 'pendiente'`
            );

            if (pendienteStatus.length > 0) {
                const pendienteId = pendienteStatus[0].status_id;

                // Actualizar requisiciones a pendiente
                await queryRunner.query(`
                    UPDATE requisitions
                    SET status_id = ${pendienteId}
                    WHERE status_id IN (
                        SELECT status_id FROM requisition_statuses
                        WHERE code IN ('pendiente_validacion', 'rechazada_validador')
                    )
                `);
            }
        }

        // 2. Eliminar los estados
        await queryRunner.query(`
            DELETE FROM requisition_statuses
            WHERE code IN ('pendiente_validacion', 'rechazada_validador')
        `);

        // 3. Reajustar el orden
        // Primero, restar 1 a todos los estados con order >= 2 (por pendiente_validacion que estaba en 1)
        await queryRunner.query(`
            UPDATE requisition_statuses
            SET "order" = "order" - 1
            WHERE "order" >= 2
        `);

        console.log('✅ Estados de validación de obra eliminados');
    }
}
