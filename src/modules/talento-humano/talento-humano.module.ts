import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TalentoHumanoController } from "./talento-humano.controller";
import { TalentoHumanoService } from "./talento-humano.service";
import { NominaController } from "./nomina.controller";
import { NominaService } from "./nomina.service";
import { ThPersona } from "../../database/entities/th-persona.entity";
import { ThIncapacidad } from "../../database/entities/th-incapacidad.entity";
import { ThAusentismo } from "../../database/entities/th-ausentismo.entity";
import { ThPrestamo } from "../../database/entities/th-prestamo.entity";
import { ThPrestamoPago } from "../../database/entities/th-prestamo-pago.entity";
import { ThHorasExtra } from "../../database/entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../../database/entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../../database/entities/th-vacacion.entity";
import { ThNovedadNomina } from "../../database/entities/th-novedad-nomina.entity";
import { ThNominaLiquidacion } from "../../database/entities/th-nomina-liquidacion.entity";
import { User } from "../../database/entities/user.entity";
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
      ThHorasExtra,
      ThHorasExtraDetalle,
      ThVacacion,
      ThNovedadNomina,
      ThNominaLiquidacion,
      User,
      RolePermission,
      RoleGestion,
    ]),
  ],
  controllers: [TalentoHumanoController, NominaController],
  providers: [TalentoHumanoService, NominaService],
  // Gestión del conocimiento lo usa para registrar en la cartera real (th_prestamos)
  // y en los ausentismos (th_ausentismos) cuando aprueba los formatos GTH-007-F y
  // GTH-009-F.
  exports: [TalentoHumanoService],
})
export class TalentoHumanoModule {}
