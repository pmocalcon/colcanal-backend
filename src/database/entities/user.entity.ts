import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role } from './role.entity';
import { Authorization } from './authorization.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 120 })
  cargo: string;

  @Column({ name: 'rol_id' })
  rolId: number;

  @Column({ type: 'boolean', default: true, nullable: true })
  estado: boolean;

  @CreateDateColumn({
    name: 'creado_en',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  creadoEn: Date;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'rol_id' })
  role: Role;

  @OneToMany(
    () => Authorization,
    (authorization) => authorization.usuarioAutorizador,
  )
  authorizationsGranted: Authorization[];

  @OneToMany(
    () => Authorization,
    (authorization) => authorization.usuarioAutorizado,
  )
  authorizationsReceived: Authorization[];
}
