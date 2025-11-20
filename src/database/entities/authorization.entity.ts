import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Gestion } from './gestion.entity';

@Entity('autorizaciones')
@Unique(['usuarioAutorizadorId', 'usuarioAutorizadoId', 'gestionId', 'tipoAutorizacion'])
export class Authorization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_autorizador' })
  usuarioAutorizadorId: number;

  @Column({ name: 'usuario_autorizado' })
  usuarioAutorizadoId: number;

  @Column({ name: 'gestion_id', nullable: true })
  gestionId: number;

  @Column({ name: 'tipo_autorizacion', type: 'varchar', length: 20, nullable: true })
  tipoAutorizacion: string;

  @Column({ type: 'integer', default: 1 })
  nivel: number;

  @Column({ name: 'es_activo', type: 'boolean', default: true })
  esActivo: boolean;

  @ManyToOne(() => User, (user) => user.authorizationsGranted)
  @JoinColumn({ name: 'usuario_autorizador' })
  usuarioAutorizador: User;

  @ManyToOne(() => User, (user) => user.authorizationsReceived)
  @JoinColumn({ name: 'usuario_autorizado' })
  usuarioAutorizado: User;

  @ManyToOne(() => Gestion, { nullable: true })
  @JoinColumn({ name: 'gestion_id' })
  gestion: Gestion;
}
