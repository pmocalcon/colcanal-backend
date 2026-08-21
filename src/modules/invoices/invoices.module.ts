import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { Invoice } from "../../database/entities/invoice.entity";
import { PurchaseOrder } from "../../database/entities/purchase-order.entity";
import { Requisition } from "../../database/entities/requisition.entity";
import { RequisitionLog } from "../../database/entities/requisition-log.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      PurchaseOrder,
      Requisition,
      // Para dejar los pasos de facturación en la bitácora de la requisición, que
      // es lo que lee la línea de tiempo de auditoría.
      RequisitionLog,
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
