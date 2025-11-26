import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesController } from './purchases.controller';
import { MasterDataController } from './master-data.controller';
import { PurchasesService } from './purchases.service';

// Import all required entities
import { Requisition } from '../../database/entities/requisition.entity';
import { RequisitionItem } from '../../database/entities/requisition-item.entity';
import { RequisitionLog } from '../../database/entities/requisition-log.entity';
import { RequisitionStatus } from '../../database/entities/requisition-status.entity';
import { RequisitionPrefix } from '../../database/entities/requisition-prefix.entity';
import { RequisitionSequence } from '../../database/entities/requisition-sequence.entity';
import { RequisitionItemApproval } from '../../database/entities/requisition-item-approval.entity';
import { Company } from '../../database/entities/company.entity';
import { Project } from '../../database/entities/project.entity';
import { OperationCenter } from '../../database/entities/operation-center.entity';
import { ProjectCode } from '../../database/entities/project-code.entity';
import { Material } from '../../database/entities/material.entity';
import { MaterialGroup } from '../../database/entities/material-group.entity';
import { MaterialCategory } from '../../database/entities/material-category.entity';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { Authorization } from '../../database/entities/authorization.entity';
import { Supplier } from '../../database/entities/supplier.entity';
import { RequisitionItemQuotation } from '../../database/entities/requisition-item-quotation.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../database/entities/purchase-order-item.entity';
import { PurchaseOrderSequence } from '../../database/entities/purchase-order-sequence.entity';
import { PurchaseOrderStatus } from '../../database/entities/purchase-order-status.entity';
import { MaterialReceipt } from '../../database/entities/material-receipt.entity';
import { MaterialPriceHistory } from '../../database/entities/material-price-history.entity';
import { PurchaseOrderApproval } from '../../database/entities/purchase-order-approval.entity';
import { PurchaseOrderItemApproval } from '../../database/entities/purchase-order-item-approval.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Requisition entities
      Requisition,
      RequisitionItem,
      RequisitionLog,
      RequisitionStatus,
      RequisitionPrefix,
      RequisitionSequence,
      RequisitionItemApproval,
      // Master data entities
      Company,
      Project,
      OperationCenter,
      ProjectCode,
      Material,
      MaterialGroup,
      MaterialCategory,
      // Auth entities
      User,
      Role,
      Authorization,
      // Purchases entities
      Supplier,
      RequisitionItemQuotation,
      PurchaseOrder,
      PurchaseOrderItem,
      PurchaseOrderSequence,
      PurchaseOrderStatus,
      MaterialReceipt,
      MaterialPriceHistory,
      PurchaseOrderApproval,
      PurchaseOrderItemApproval,
    ]),
  ],
  controllers: [MasterDataController, PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}

