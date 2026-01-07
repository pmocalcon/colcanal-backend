import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Survey } from './survey.entity';
import { Ucap } from './ucap.entity';

@Entity('survey_budget_items')
export class SurveyBudgetItem {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  itemId: number;

  @Column({ name: 'survey_id' })
  surveyId: number;

  @Column({ name: 'ucap_id' })
  ucapId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_value', type: 'decimal', precision: 15, scale: 2 })
  unitValue: number;

  @Column({ name: 'budgeted_value', type: 'decimal', precision: 15, scale: 2 })
  budgetedValue: number;

  @Column({ name: 'initial_ipp', type: 'decimal', precision: 10, scale: 2 })
  initialIpp: number;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'survey_id' })
  survey: Survey;

  @ManyToOne(() => Ucap)
  @JoinColumn({ name: 'ucap_id' })
  ucap: Ucap;
}
