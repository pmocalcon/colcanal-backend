import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GestionConocimientoController } from "./gestion-conocimiento.controller";
import { GestionConocimientoService } from "./gestion-conocimiento.service";
import { GcSolicitud } from "../../database/entities/gc-solicitud.entity";
import { User } from "../../database/entities/user.entity";
import { Material } from "../../database/entities/material.entity";
import { OperationCenter } from "../../database/entities/operation-center.entity";
import { Authorization } from "../../database/entities/authorization.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { PurchasesModule } from "../purchases/purchases.module";
import { TalentoHumanoModule } from "../talento-humano/talento-humano.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([GcSolicitud, User, Material, OperationCenter, Authorization]),
    NotificationsModule,
    // Para crear automáticamente la requisición de la póliza (ítem POLIZA) en
    // Gestión de Compras cuando la solicitud jurídica entra a "Solicitud de pólizas".
    PurchasesModule,
    // Para alimentar la cartera real (th_prestamos) y los ausentismos (th_ausentismos)
    // cuando se aprueban los formatos GTH-007-F y GTH-009-F.
    TalentoHumanoModule,
  ],
  controllers: [GestionConocimientoController],
  providers: [GestionConocimientoService],
})
export class GestionConocimientoModule {}
