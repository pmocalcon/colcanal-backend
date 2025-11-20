import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Role } from './role.entity';
import { Gestion } from './gestion.entity';

@Entity('roles_gestiones')
@Unique(['rolId', 'gestionId'])
export class RoleGestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rol_id' })
  rolId: number;

  @Column({ name: 'gestion_id' })
  gestionId: number;

  @ManyToOne(() => Role, (role) => role.roleGestiones)
  @JoinColumn({ name: 'rol_id' })
  role: Role;

  @ManyToOne(() => Gestion, (gestion) => gestion.roleGestiones)
  @JoinColumn({ name: 'gestion_id' })
  gestion: Gestion;
}
