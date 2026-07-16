import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CregController } from "./creg.controller";
import { CregService } from "./creg.service";
import { CregMunicipioConfig } from "../../database/entities/creg-municipio-config.entity";
import { CregParametrizacion } from "../../database/entities/creg-parametrizacion.entity";
import { CregCenso } from "../../database/entities/creg-censo.entity";
import { Ucap } from "../../database/entities/ucap.entity";
import { UcapCostItem } from "../../database/entities/ucap-cost-item.entity";
import { UcapApellido } from "../../database/entities/ucap-apellido.entity";
import { Company } from "../../database/entities/company.entity";
import { Project } from "../../database/entities/project.entity";
import { RolePermission } from "../../database/entities/role-permission.entity";
import { RoleGestion } from "../../database/entities/role-gestion.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CregMunicipioConfig,
      CregParametrizacion,
      CregCenso,
      Ucap,
      UcapCostItem,
      UcapApellido,
      Company,
      Project,
      RolePermission,
      RoleGestion,
    ]),
  ],
  controllers: [CregController],
  providers: [CregService],
})
export class CregModule {}
