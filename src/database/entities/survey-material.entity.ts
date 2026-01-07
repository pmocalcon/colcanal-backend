import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Survey } from './survey.entity';
import { Material } from './material.entity';

@Entity('survey_materials')
export class SurveyMaterial {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  itemId: number;

  @Column({ name: 'survey_id' })
  surveyId: number;

  @Column({ name: 'material_id', nullable: true })
  materialId: number;

  @Column({ name: 'material_code', type: 'varchar', length: 50, nullable: true })
  materialCode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'unit_of_measure', type: 'varchar', length: 50, nullable: true })
  unitOfMeasure: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'survey_id' })
  survey: Survey;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;
}
