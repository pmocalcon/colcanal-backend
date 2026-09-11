import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { ObrasAuditController } from "./obras-audit.controller";
import { ObrasAuditService } from "./obras-audit.service";
import { RequisitionLog } from "../../database/entities/requisition-log.entity";
import { Requisition } from "../../database/entities/requisition.entity";
import { PurchaseOrder } from "../../database/entities/purchase-order.entity";
// Auditoria de obras: la bitacora y las dos filas que audita (el acta y la obra).
import { WorkLog } from "../../database/entities/work-log.entity";
import { WorkActa } from "../../database/entities/work-acta.entity";
import { Work } from "../../database/entities/work.entity";
// Las lee PermissionsGuard para resolver `auditorias:ver`.
import { RolePermission } from "../../database/entities/role-permission.entity";
import { RoleGestion } from "../../database/entities/role-gestion.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RequisitionLog,
      Requisition,
      PurchaseOrder,
      WorkLog,
      WorkActa,
      Work,
      RolePermission,
      RoleGestion,
    ]),
  ],
  controllers: [AuditController, ObrasAuditController],
  providers: [AuditService, ObrasAuditService],
  exports: [AuditService, ObrasAuditService],
})
export class AuditModule {}
