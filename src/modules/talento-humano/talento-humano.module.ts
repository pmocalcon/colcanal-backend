import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TalentoHumanoController } from "./talento-humano.controller";
import { TalentoHumanoService } from "./talento-humano.service";
import { ThPersona } from "../../database/entities/th-persona.entity";
import { ThIncapacidad } from "../../database/entities/th-incapacidad.entity";
import { ThAusentismo } from "../../database/entities/th-ausentismo.entity";
// RolesGuard los inyecta para resolver el rol del usuario.
import { RolePermission } from "../../database/entities/role-permission.entity";
import { RoleGestion } from "../../database/entities/role-gestion.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ThPersona,
      ThIncapacidad,
      ThAusentismo,
      RolePermission,
      RoleGestion,
    ]),
  ],
  controllers: [TalentoHumanoController],
  providers: [TalentoHumanoService],
})
export class TalentoHumanoModule {}
