import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CregController } from "./creg.controller";
import { CregService } from "./creg.service";
import { CregMunicipioConfig } from "../../database/entities/creg-municipio-config.entity";
import { CregParametrizacion } from "../../database/entities/creg-parametrizacion.entity";
import { CregIppMensual } from "../../database/entities/creg-ipp-mensual.entity";
import { CregCenso } from "../../database/entities/creg-censo.entity";
import { CregLiquidacion } from "../../database/entities/creg-liquidacion.entity";
import { CregIddOff } from "../../database/entities/creg-idd-off.entity";
import { CregFacturaEnergia } from "../../database/entities/creg-factura-energia.entity";
import { CregIddOn } from "../../database/entities/creg-idd-on.entity";
import { Ucap } from "../../database/entities/ucap.entity";
import { UcapCostItem } from "../../database/entities/ucap-cost-item.entity";
import { UcapApellido } from "../../database/entities/ucap-apellido.entity";
import { Company } from "../../database/entities/company.entity";
import { Project } from "../../database/entities/project.entity";
import { RolePermission } from "../../database/entities/role-permission.entity";
import { RoleGestion } from "../../database/entities/role-gestion.entity";
import { User } from "../../database/entities/user.entity";
import { SurveyReviewerAccess } from "../../database/entities/survey-reviewer-access.entity";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      CregMunicipioConfig,
      CregParametrizacion,
      CregIppMensual,
      CregCenso,
      CregLiquidacion,
      CregIddOff,
      CregFacturaEnergia,
      CregIddOn,
      Ucap,
      UcapCostItem,
      UcapApellido,
      Company,
      Project,
      RolePermission,
      RoleGestion,
      User,
      SurveyReviewerAccess,
    ]),
  ],
  controllers: [CregController],
  providers: [CregService],
})
export class CregModule {}
