import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TalentoHumanoController } from "./talento-humano.controller";
import { TalentoHumanoService } from "./talento-humano.service";
import { ThPersona } from "../../database/entities/th-persona.entity";
import { ThIncapacidad } from "../../database/entities/th-incapacidad.entity";
import { ThAusentismo } from "../../database/entities/th-ausentismo.entity";
import { ThPrestamo } from "../../database/entities/th-prestamo.entity";
import { ThPrestamoPago } from "../../database/entities/th-prestamo-pago.entity";
// RolesGuard los inyecta para resolver el rol del usuario.
import { RolePermission } from "../../database/entities/role-permission.entity";
import { RoleGestion } from "../../database/entities/role-gestion.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ThPersona,
      ThIncapacidad,
      ThAusentismo,
      ThPrestamo,
      ThPrestamoPago,
      RolePermission,
      RoleGestion,
    ]),
  ],
  controllers: [TalentoHumanoController],
  providers: [TalentoHumanoService],
})
export class TalentoHumanoModule {}
