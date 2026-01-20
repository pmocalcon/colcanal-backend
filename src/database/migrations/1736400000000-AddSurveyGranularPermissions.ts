import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSurveyGranularPermissions1736400000000 implements MigrationInterface {
    name = 'AddSurveyGranularPermissions1736400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Crear permisos granulares para levantamientos
        await queryRunner.query(`
            INSERT INTO permisos (nombre_permiso, descripcion)
            VALUES
                ('levantamientos:ver', 'Ver levantamientos de obras'),
                ('levantamientos:crear', 'Crear levantamientos de obras'),
                ('levantamientos:editar', 'Editar levantamientos de obras'),
                ('levantamientos:eliminar', 'Eliminar levantamientos de obras'),
                ('levantamientos:revisar', 'Revisar bloques de levantamientos'),
                ('levantamientos:aprobar', 'Aprobar levantamientos completos'),
                ('levantamientos:reabrir', 'Reabrir levantamientos aprobados')
            ON CONFLICT (nombre_permiso) DO NOTHING
        `);

        // 2. Asignar permisos a rol "PQRS" (category = 'PQRS')
        // PQRS puede: ver, crear, editar, eliminar (pero NO revisar/aprobar/reabrir)
        await queryRunner.query(`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            SELECT r.rol_id, p.permiso_id
            FROM roles r
            CROSS JOIN permisos p
            WHERE r.category = 'PQRS'
            AND p.nombre_permiso IN (
                'levantamientos:ver',
                'levantamientos:crear',
                'levantamientos:editar',
                'levantamientos:eliminar'
            )
            ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `);

        // 3. Asignar permisos a "Coordinador Operativo"
        // Coordinador puede: ver, crear, editar, eliminar (pero NO revisar/aprobar/reabrir)
        await queryRunner.query(`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            SELECT r.rol_id, p.permiso_id
            FROM roles r
            CROSS JOIN permisos p
            WHERE r.nombre_rol = 'Coordinador Operativo'
            AND p.nombre_permiso IN (
                'levantamientos:ver',
                'levantamientos:crear',
                'levantamientos:editar',
                'levantamientos:eliminar'
            )
            ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `);

        // 4. Asignar permisos a "Director de Proyecto"
        // Director de Proyecto solo puede: ver (no crear)
        await queryRunner.query(`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            SELECT r.rol_id, p.permiso_id
            FROM roles r
            CROSS JOIN permisos p
            WHERE r.nombre_rol = 'Director de Proyecto'
            AND p.nombre_permiso = 'levantamientos:ver'
            ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `);

        // 5. Asignar permisos a "Director Técnico"
        // Director Técnico puede: ver, revisar, aprobar, reabrir (NO crear/editar/eliminar)
        await queryRunner.query(`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            SELECT r.rol_id, p.permiso_id
            FROM roles r
            CROSS JOIN permisos p
            WHERE r.nombre_rol = 'Director Técnico'
            AND p.nombre_permiso IN (
                'levantamientos:ver',
                'levantamientos:revisar',
                'levantamientos:aprobar',
                'levantamientos:reabrir'
            )
            ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `);

        // 6. Asignar TODOS los permisos a "Super Admin" (si existe)
        await queryRunner.query(`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            SELECT r.rol_id, p.permiso_id
            FROM roles r
            CROSS JOIN permisos p
            WHERE r.nombre_rol = 'Super Admin'
            AND p.nombre_permiso LIKE 'levantamientos:%'
            ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir: Eliminar todos los permisos de levantamientos de roles
        await queryRunner.query(`
            DELETE FROM roles_permisos
            WHERE permiso_id IN (
                SELECT permiso_id FROM permisos
                WHERE nombre_permiso LIKE 'levantamientos:%'
            )
        `);

        // Revertir: Eliminar los permisos granulares de levantamientos
        await queryRunner.query(`
            DELETE FROM permisos
            WHERE nombre_permiso LIKE 'levantamientos:%'
        `);
    }
}
