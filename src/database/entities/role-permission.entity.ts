import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Role } from "./role.entity";
import { Permission } from "./permission.entity";

/**
 * Relación rol–permiso: qué permisos tiene un rol.
 */
@Entity("roles_permisos")
@Unique(["rolId", "permisoId"])
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "rol_id" })
  rolId: number;

  @Column({ name: "permiso_id" })
  permisoId: number;

  @ManyToOne(() => Role, (role) => role.rolePermissions)
  @JoinColumn({ name: "rol_id" })
  role: Role;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions)
  @JoinColumn({ name: "permiso_id" })
  permission: Permission;
}
