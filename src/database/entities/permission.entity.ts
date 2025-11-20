import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { RolePermission } from './role-permission.entity';

@Entity('permisos')
export class Permission {
  @PrimaryGeneratedColumn({ name: 'permiso_id' })
  permisoId: number;

  @Column({
    name: 'nombre_permiso',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  nombrePermiso: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string;

  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions: RolePermission[];
}
