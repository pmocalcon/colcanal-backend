import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';

// Survey entities
import { Work } from '../../database/entities/work.entity';
import { WorkActa } from '../../database/entities/work-acta.entity';
import { ActaSummaryDraft } from '../../database/entities/acta-summary-draft.entity';
import { AnnualPlanReview } from '../../database/entities/annual-plan-review.entity';
import { Survey } from '../../database/entities/survey.entity';
import { SurveyBudgetItem } from '../../database/entities/survey-budget-item.entity';
import { SurveyInvestmentItem } from '../../database/entities/survey-investment-item.entity';
import { SurveyMaterial } from '../../database/entities/survey-material.entity';
import { SurveyTravelExpense } from '../../database/entities/survey-travel-expense.entity';
import { Ucap } from '../../database/entities/ucap.entity';
import { SurveyReviewerAccess } from '../../database/entities/survey-reviewer-access.entity';

// Related entities
import { Company } from '../../database/entities/company.entity';
import { Project } from '../../database/entities/project.entity';
import { User } from '../../database/entities/user.entity';
import { Material } from '../../database/entities/material.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { RoleGestion } from '../../database/entities/role-gestion.entity';
import { Requisition } from '../../database/entities/requisition.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      // Survey entities
      Work,
      WorkActa,
      ActaSummaryDraft,
      AnnualPlanReview,
      Survey,
      SurveyBudgetItem,
      SurveyInvestmentItem,
      SurveyMaterial,
      SurveyTravelExpense,
      Ucap,
      SurveyReviewerAccess,
      // Related entities
      Company,
      Project,
      User,
      Material,
      RolePermission,
      RoleGestion,
      // Para estampar el código de contabilidad en las requisiciones anticipadas.
      Requisition,
    ]),
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
