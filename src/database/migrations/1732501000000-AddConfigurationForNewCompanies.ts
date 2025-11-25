import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConfigurationForNewCompanies1732501000000 implements MigrationInterface {
    name = 'AddConfigurationForNewCompanies1732501000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Agregar centros de operación para las nuevas empresas
        await queryRunner.query(`
            INSERT INTO operation_centers (company_id, project_id, code)
            SELECT company_id, NULL, '009'
            FROM companies
            WHERE name = 'Uniones y Alianzas'
            ON CONFLICT DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO operation_centers (company_id, project_id, code)
            SELECT company_id, NULL, '010'
            FROM companies
            WHERE name = 'Inversiones Garcés Escalante'
            ON CONFLICT DO NOTHING
        `);

        // 2. Agregar prefijos de requisición para las nuevas empresas
        await queryRunner.query(`
            INSERT INTO requisition_prefixes (company_id, project_id, prefix)
            SELECT company_id, NULL, 'U&A'
            FROM companies
            WHERE name = 'Uniones y Alianzas'
            ON CONFLICT DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO requisition_prefixes (company_id, project_id, prefix)
            SELECT company_id, NULL, 'IGE'
            FROM companies
            WHERE name = 'Inversiones Garcés Escalante'
            ON CONFLICT DO NOTHING
        `);

        // 3. Crear secuencias de requisición para los nuevos prefijos
        await queryRunner.query(`
            INSERT INTO requisition_sequences (prefix_id, last_number)
            SELECT prefix_id, 0
            FROM requisition_prefixes
            WHERE prefix IN ('U&A', 'IGE')
            AND NOT EXISTS (
                SELECT 1 FROM requisition_sequences rs
                WHERE rs.prefix_id = requisition_prefixes.prefix_id
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir: Eliminar secuencias de requisición
        await queryRunner.query(`
            DELETE FROM requisition_sequences
            WHERE prefix_id IN (
                SELECT prefix_id FROM requisition_prefixes
                WHERE prefix IN ('U&A', 'IGE')
            )
        `);

        // Revertir: Eliminar prefijos de requisición
        await queryRunner.query(`
            DELETE FROM requisition_prefixes
            WHERE company_id IN (
                SELECT company_id FROM companies
                WHERE name IN ('Uniones y Alianzas', 'Inversiones Garcés Escalante')
            )
        `);

        // Revertir: Eliminar centros de operación
        await queryRunner.query(`
            DELETE FROM operation_centers
            WHERE company_id IN (
                SELECT company_id FROM companies
                WHERE name IN ('Uniones y Alianzas', 'Inversiones Garcés Escalante')
            )
        `);
    }
}
