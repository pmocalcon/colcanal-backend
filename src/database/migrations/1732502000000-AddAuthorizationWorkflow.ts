import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthorizationWorkflow1732502000000 implements MigrationInterface {
    name = 'AddAuthorizationWorkflow1732502000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Agregar nuevo rol "Gerencia de Proyectos"
        await queryRunner.query(`
            INSERT INTO roles (nombre_rol, descripcion, category)
            VALUES ('Gerencia de Proyectos', 'Autoriza requisiciones creadas por Directores de Proyecto', 'GERENCIA')
            ON CONFLICT DO NOTHING
        `);

        // 2. Actualizar el orden de los estados existentes para hacer espacio
        // Incrementar en 2 el orden de todos los estados con order >= 4
        await queryRunner.query(`
            UPDATE requisition_statuses
            SET "order" = "order" + 2
            WHERE "order" >= 4
        `);

        // 3. Agregar los dos nuevos estados de autorización
        await queryRunner.query(`
            INSERT INTO requisition_statuses (code, name, description, color, "order")
            VALUES
                ('pendiente_autorizacion', 'Pendiente de autorización', 'Esperando autorización de Gerencia de Proyectos', 'amber', 4),
                ('autorizado', 'Autorizado', 'Autorizado por Gerencia de Proyectos, listo para Gerencia', 'lime', 5)
            ON CONFLICT (code) DO NOTHING
        `);

        // 4. Actualizar la descripción de "aprobada_revisor" para reflejar el nuevo flujo
        await queryRunner.query(`
            UPDATE requisition_statuses
            SET description = 'Pendiente de autorización de Gerencia de Proyectos'
            WHERE code = 'aprobada_revisor'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir: Eliminar los nuevos estados
        await queryRunner.query(`
            DELETE FROM requisition_statuses
            WHERE code IN ('pendiente_autorizacion', 'autorizado')
        `);

        // Revertir: Restaurar el orden de los estados
        await queryRunner.query(`
            UPDATE requisition_statuses
            SET "order" = "order" - 2
            WHERE "order" >= 6
        `);

        // Revertir: Restaurar la descripción de "aprobada_revisor"
        await queryRunner.query(`
            UPDATE requisition_statuses
            SET description = 'Lista para revisión de Gerencia'
            WHERE code = 'aprobada_revisor'
        `);

        // Revertir: Eliminar el nuevo rol
        await queryRunner.query(`
            DELETE FROM roles
            WHERE nombre_rol = 'Gerencia de Proyectos'
        `);
    }
}
