import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRechazadaAutorizadorStatus1733100000000 implements MigrationInterface {
    name = 'AddRechazadaAutorizadorStatus1733100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agregar el nuevo estado "rechazada_autorizador" para cuando Gerencia de Proyectos rechaza
        // Se inserta con order 8.5 (entre rechazada_revisor=8 y rechazada_gerencia=9)
        // Primero incrementamos el order de los estados >= 9
        await queryRunner.query(`
            UPDATE requisition_statuses
            SET "order" = "order" + 1
            WHERE "order" >= 9
        `);

        // Insertar el nuevo estado con order 9
        await queryRunner.query(`
            INSERT INTO requisition_statuses (code, name, description, color, "order")
            VALUES (
                'rechazada_autorizador',
                'Rechazada por autorizador',
                'Devuelta al solicitante por Gerencia de Proyectos',
                'amber',
                9
            )
            ON CONFLICT (code) DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar el estado
        await queryRunner.query(`
            DELETE FROM requisition_statuses
            WHERE code = 'rechazada_autorizador'
        `);

        // Restaurar el order de los estados
        await queryRunner.query(`
            UPDATE requisition_statuses
            SET "order" = "order" - 1
            WHERE "order" >= 9
        `);
    }
}
