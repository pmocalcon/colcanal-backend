import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnalistaPMOSurveyApprovalPermissions1748200000000 implements MigrationInterface {
  name = 'AddAnalistaPMOSurveyApprovalPermissions1748200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.rol_id, p.permiso_id
      FROM roles r
      CROSS JOIN permisos p
      WHERE r.nombre_rol = 'Analista PMO'
        AND p.nombre_permiso IN (
          'levantamientos:ver',
          'levantamientos:revisar',
          'levantamientos:aprobar'
        )
      ON CONFLICT (rol_id, permiso_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM roles_permisos
      WHERE rol_id = (SELECT rol_id FROM roles WHERE nombre_rol = 'Analista PMO')
        AND permiso_id IN (
          SELECT permiso_id FROM permisos
          WHERE nombre_permiso IN (
            'levantamientos:revisar',
            'levantamientos:aprobar'
          )
        )
    `);
  }
}
