import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { User } from './user.entity';
import { RolePermission } from './role-permission.entity';
import { RoleGestion } from './role-gestion.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ name: 'rol_id' })
  rolId: number;

  @Column({ name: 'nombre_rol', type: 'varchar', length: 50, unique: true })
  nombreRol: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  category: string;

  @Column({
    name: 'default_module',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  defaultModule: string;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: RolePermission[];

  @OneToMany(() => RoleGestion, (roleGestion) => roleGestion.role)
  roleGestiones: RoleGestion[];
}
