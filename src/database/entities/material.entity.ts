import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { MaterialGroup } from './material-group.entity';
import { RequisitionItem } from './requisition-item.entity';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn({ name: 'material_id' })
  materialId: number;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'group_id' })
  groupId: number;

  @ManyToOne(() => MaterialGroup, (materialGroup) => materialGroup.materials)
  @JoinColumn({ name: 'group_id' })
  materialGroup: MaterialGroup;

  @OneToMany(() => RequisitionItem, (item) => item.material)
  requisitionItems: RequisitionItem[];
}
