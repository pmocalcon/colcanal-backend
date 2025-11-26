import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from '../../database/entities/invoice.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { Requisition } from '../../database/entities/requisition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, PurchaseOrder, Requisition])],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
