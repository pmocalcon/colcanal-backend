import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCompaniesAndProjects1732500000000 implements MigrationInterface {
    name = 'UpdateCompaniesAndProjects1732500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Actualizar el nombre del proyecto "Administrativo" a "Oficina Principal"
        await queryRunner.query(`
            UPDATE projects
            SET name = 'Oficina Principal'
            WHERE name = 'Administrativo'
            AND company_id = 1
        `);

        // 2. Agregar dos nuevas empresas
        await queryRunner.query(`
            INSERT INTO companies (name)
            VALUES ('Uniones y Alianzas')
            ON CONFLICT DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO companies (name)
            VALUES ('Inversiones Garcés Escalante')
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir: Cambiar "Oficina Principal" de vuelta a "Administrativo"
        await queryRunner.query(`
            UPDATE projects
            SET name = 'Administrativo'
            WHERE name = 'Oficina Principal'
            AND company_id = 1
        `);

        // Revertir: Eliminar las empresas agregadas
        await queryRunner.query(`
            DELETE FROM companies
            WHERE name IN ('Uniones y Alianzas', 'Inversiones Garcés Escalante')
        `);
    }
}
