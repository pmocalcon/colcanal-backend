import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { RoleGestion } from './role-gestion.entity';
import { Authorization } from './authorization.entity';

@Entity('gestiones')
export class Gestion {
  @PrimaryGeneratedColumn({ name: 'gestion_id' })
  gestionId: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  icono: string;

  @OneToMany(() => RoleGestion, (roleGestion) => roleGestion.gestion)
  roleGestiones: RoleGestion[];

  @OneToMany(() => Authorization, (authorization) => authorization.gestion)
  authorizations: Authorization[];
}
