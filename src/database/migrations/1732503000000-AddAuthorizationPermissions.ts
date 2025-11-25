import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthorizationPermissions1732503000000 implements MigrationInterface {
    name = 'AddAuthorizationPermissions1732503000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Agregar el permiso "Autorizar"
        await queryRunner.query(`
            INSERT INTO permisos (nombre_permiso, descripcion)
            VALUES ('Autorizar', 'Permiso para autorizar requisiciones de Directores de Proyecto')
            ON CONFLICT DO NOTHING
        `);

        // 2. Asignar gestión de Inventarios a "Gerencia de Proyectos"
        await queryRunner.query(`
            INSERT INTO roles_gestiones (rol_id, gestion_id)
            SELECT r.rol_id, g.gestion_id
            FROM roles r, gestiones g
            WHERE r.nombre_rol = 'Gerencia de Proyectos'
            AND g.slug = 'inventarios'
            ON CONFLICT DO NOTHING
        `);

        // 3. Asignar permisos a "Gerencia de Proyectos"
        // Ver, Crear, Autorizar
        await queryRunner.query(`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            SELECT r.rol_id, p.permiso_id
            FROM roles r, permisos p
            WHERE r.nombre_rol = 'Gerencia de Proyectos'
            AND p.nombre_permiso IN ('Ver', 'Crear', 'Autorizar')
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir: Eliminar permisos de "Gerencia de Proyectos"
        await queryRunner.query(`
            DELETE FROM roles_permisos
            WHERE rol_id IN (SELECT rol_id FROM roles WHERE nombre_rol = 'Gerencia de Proyectos')
        `);

        // Revertir: Eliminar gestión de Inventarios de "Gerencia de Proyectos"
        await queryRunner.query(`
            DELETE FROM roles_gestiones
            WHERE rol_id IN (SELECT rol_id FROM roles WHERE nombre_rol = 'Gerencia de Proyectos')
            AND gestion_id IN (SELECT gestion_id FROM gestiones WHERE slug = 'inventarios')
        `);

        // Revertir: Eliminar el permiso "Autorizar"
        await queryRunner.query(`
            DELETE FROM permisos
            WHERE nombre_permiso = 'Autorizar'
        `);
    }
}
