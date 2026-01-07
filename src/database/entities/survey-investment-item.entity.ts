import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Survey } from './survey.entity';

@Entity('survey_investment_items')
export class SurveyInvestmentItem {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  itemId: number;

  @Column({ name: 'survey_id' })
  surveyId: number;

  @Column({ name: 'order_number', type: 'int', default: 0 })
  orderNumber: number;

  @Column({ type: 'varchar', length: 20 })
  point: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'luminaire_quantity', type: 'int', default: 0 })
  luminaireQuantity: number;

  @Column({ name: 'relocated_luminaire_quantity', type: 'int', default: 0 })
  relocatedLuminaireQuantity: number;

  @Column({ name: 'pole_quantity', type: 'int', default: 0 })
  poleQuantity: number;

  @Column({ name: 'braided_network', type: 'decimal', precision: 10, scale: 2, default: 0 })
  braidedNetwork: number;

  @Column({ type: 'decimal', precision: 12, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 12, scale: 8, nullable: true })
  longitude: number;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'survey_id' })
  survey: Survey;
}
