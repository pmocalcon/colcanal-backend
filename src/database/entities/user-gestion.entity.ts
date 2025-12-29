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

@Entity('users_gestiones')
@Unique(['userId', 'gestionId'])
export class UserGestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'gestion_id' })
  gestionId: number;

  @ManyToOne(() => User, (user) => user.userGestiones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Gestion, (gestion) => gestion.userGestiones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gestion_id' })
  gestion: Gestion;
}
