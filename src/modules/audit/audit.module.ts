import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { RequisitionLog } from "../../database/entities/requisition-log.entity";
import { Requisition } from "../../database/entities/requisition.entity";
import { PurchaseOrder } from "../../database/entities/purchase-order.entity";

@Module({
  imports: [TypeOrmModule.forFeature([RequisitionLog, Requisition, PurchaseOrder])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
