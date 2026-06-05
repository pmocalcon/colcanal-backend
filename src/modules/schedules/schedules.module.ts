import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { Schedule } from '../../database/entities/schedule.entity';
import { ScheduleItem } from '../../database/entities/schedule-item.entity';
import { ScheduleDailyPlan } from '../../database/entities/schedule-daily-plan.entity';
import { ScheduleMaterialLog } from '../../database/entities/schedule-material-log.entity';
import { ScheduleExecution } from '../../database/entities/schedule-execution.entity';
import { Survey } from '../../database/entities/survey.entity';
import { SurveyBudgetItem } from '../../database/entities/survey-budget-item.entity';
import { SurveyMaterial } from '../../database/entities/survey-material.entity';
import { Work } from '../../database/entities/work.entity';
import { Ucap } from '../../database/entities/ucap.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { RoleGestion } from '../../database/entities/role-gestion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      ScheduleItem,
      ScheduleDailyPlan,
      ScheduleMaterialLog,
      ScheduleExecution,
      Survey,
      SurveyBudgetItem,
      SurveyMaterial,
      Work,
      Ucap,
      RolePermission,
      RoleGestion,
    ]),
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
})
export class SchedulesModule {}
