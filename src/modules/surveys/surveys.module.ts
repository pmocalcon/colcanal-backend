import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';

// Survey entities
import { Work } from '../../database/entities/work.entity';
import { Survey } from '../../database/entities/survey.entity';
import { SurveyBudgetItem } from '../../database/entities/survey-budget-item.entity';
import { SurveyInvestmentItem } from '../../database/entities/survey-investment-item.entity';
import { SurveyMaterial } from '../../database/entities/survey-material.entity';
import { SurveyTravelExpense } from '../../database/entities/survey-travel-expense.entity';
import { Ucap } from '../../database/entities/ucap.entity';

// Related entities
import { Company } from '../../database/entities/company.entity';
import { Project } from '../../database/entities/project.entity';
import { User } from '../../database/entities/user.entity';
import { Material } from '../../database/entities/material.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Survey entities
      Work,
      Survey,
      SurveyBudgetItem,
      SurveyInvestmentItem,
      SurveyMaterial,
      SurveyTravelExpense,
      Ucap,
      // Related entities
      Company,
      Project,
      User,
      Material,
    ]),
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
