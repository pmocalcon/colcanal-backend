import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Survey } from './survey.entity';

export enum TravelExpenseType {
  TOLLS = 'tolls',
  PARKING = 'parking',
  LODGING = 'lodging',
  FOOD = 'food',
  FUEL = 'fuel',
  ADDITIONAL_CREW = 'additional_crew',
  DAY_HOURS = 'day_hours',
  HOLIDAY_OVERTIME = 'holiday_overtime',
}

@Entity('survey_travel_expenses')
export class SurveyTravelExpense {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  itemId: number;

  @Column({ name: 'survey_id' })
  surveyId: number;

  @Column({
    name: 'expense_type',
    type: 'enum',
    enum: TravelExpenseType,
  })
  expenseType: TravelExpenseType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'survey_id' })
  survey: Survey;
}
