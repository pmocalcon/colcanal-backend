import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirectorBudgetsController } from './director-budgets.controller';
import { DirectorBudgetsService } from './director-budgets.service';
import { DirectorBudget } from '../../database/entities/director-budget.entity';
import { DirectorBudgetItem } from '../../database/entities/director-budget-item.entity';
import { Work } from '../../database/entities/work.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { RoleGestion } from '../../database/entities/role-gestion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DirectorBudget,
      DirectorBudgetItem,
      Work,
      RolePermission,
      RoleGestion,
    ]),
  ],
  controllers: [DirectorBudgetsController],
  providers: [DirectorBudgetsService],
})
export class DirectorBudgetsModule {}
