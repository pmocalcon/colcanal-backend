import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirectorBudgetsController } from './director-budgets.controller';
import { DirectorBudgetsService } from './director-budgets.service';
import { DirectorBudget } from '../../database/entities/director-budget.entity';
import { DirectorBudgetItem } from '../../database/entities/director-budget-item.entity';
import { Work } from '../../database/entities/work.entity';
import { User } from '../../database/entities/user.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { RoleGestion } from '../../database/entities/role-gestion.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SurveysModule } from '../surveys/surveys.module';

@Module({
  imports: [
    // Aprobar el presupuesto cierra el presupuesto del acta, que vive en surveys.
    SurveysModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      DirectorBudget,
      DirectorBudgetItem,
      Work,
      User,
      RolePermission,
      RoleGestion,
    ]),
  ],
  controllers: [DirectorBudgetsController],
  providers: [DirectorBudgetsService],
})
export class DirectorBudgetsModule {}
