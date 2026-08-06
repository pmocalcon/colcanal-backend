import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecursoEconomicoController } from "./recurso-economico.controller";
import { RecursoEconomicoService } from "./recurso-economico.service";
import { RecursoEconomico } from "../../database/entities/recurso-economico.entity";
import { Company } from "../../database/entities/company.entity";
// PermissionsGuard los inyecta para resolver los permisos del rol.
import { RolePermission } from "../../database/entities/role-permission.entity";
import { RoleGestion } from "../../database/entities/role-gestion.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([RecursoEconomico, Company, RolePermission, RoleGestion]),
  ],
  controllers: [RecursoEconomicoController],
  providers: [RecursoEconomicoService],
})
export class RecursoEconomicoModule {}
