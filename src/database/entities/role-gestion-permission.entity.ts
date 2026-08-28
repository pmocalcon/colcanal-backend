import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Role } from "./role.entity";
import { Gestion } from "./gestion.entity";
import { Permission } from "./permission.entity";

/**
 * Permiso de un rol dentro de un módulo concreto: la matriz (rol × módulo × permiso).
 *
 * Reemplaza, para el motor de acceso, a la combinación "permiso global × todos los
 * módulos del rol": aquí un rol puede tener Aprobar en Compras y solo Ver en Usuarios.
 * Es tabla nueva —con su propia secuencia— para no tocar `roles_permisos` ni `permisos`.
 */
@Entity("roles_gestiones_permisos")
@Unique(["rolId", "gestionId", "permisoId"])
export class RoleGestionPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "rol_id" })
  rolId: number;

  @Column({ name: "gestion_id" })
  gestionId: number;

  @Column({ name: "permiso_id" })
  permisoId: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: "rol_id" })
  role: Role;

  @ManyToOne(() => Gestion)
  @JoinColumn({ name: "gestion_id" })
  gestion: Gestion;

  @ManyToOne(() => Permission)
  @JoinColumn({ name: "permiso_id" })
  permission: Permission;
}
