import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { MaterialGroup } from './material-group.entity';

@Entity('material_categories')
export class MaterialCategory {
  @PrimaryGeneratedColumn({ name: 'category_id' })
  categoryId: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => MaterialGroup, (group) => group.category)
  groups: MaterialGroup[];
}
