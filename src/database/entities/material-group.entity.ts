import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Material } from './material.entity';

@Entity('material_groups')
export class MaterialGroup {
  @PrimaryGeneratedColumn({ name: 'group_id' })
  groupId: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @OneToMany(() => Material, (material) => material.materialGroup)
  materials: Material[];
}
