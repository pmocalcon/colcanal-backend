import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Material } from './material.entity';
import { MaterialCategory } from './material-category.entity';

@Entity('material_groups')
export class MaterialGroup {
  @PrimaryGeneratedColumn({ name: 'group_id' })
  groupId: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number;

  @ManyToOne(() => MaterialCategory, (category) => category.groups)
  @JoinColumn({ name: 'category_id' })
  category: MaterialCategory;

  @OneToMany(() => Material, (material) => material.materialGroup)
  materials: Material[];
}
