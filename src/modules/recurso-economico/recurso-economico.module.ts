import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecursoEconomicoController } from "./recurso-economico.controller";
import { RecursoEconomicoService } from "./recurso-economico.service";
import { CepController } from "./cep.controller";
import { CepService } from "./cep.service";
import { RecursoEconomico } from "../../database/entities/recurso-economico.entity";
import { CepMes } from "../../database/entities/cep-mes.entity";
import { CepOrdenPago } from "../../database/entities/cep-orden-pago.entity";
import { Company } from "../../database/entities/company.entity";
// PermissionsGuard los inyecta para resolver los permisos del rol.
import { RolePermission } from "../../database/entities/role-permission.entity";
import { RoleGestion } from "../../database/entities/role-gestion.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecursoEconomico, CepMes, CepOrdenPago, Company, RolePermission, RoleGestion,
    ]),
  ],
  controllers: [RecursoEconomicoController, CepController],
  providers: [RecursoEconomicoService, CepService],
})
export class RecursoEconomicoModule {}
