"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchasesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const purchases_controller_1 = require("./purchases.controller");
const master_data_controller_1 = require("./master-data.controller");
const purchases_service_1 = require("./purchases.service");
const requisition_entity_1 = require("../../database/entities/requisition.entity");
const requisition_item_entity_1 = require("../../database/entities/requisition-item.entity");
const requisition_log_entity_1 = require("../../database/entities/requisition-log.entity");
const requisition_status_entity_1 = require("../../database/entities/requisition-status.entity");
const requisition_prefix_entity_1 = require("../../database/entities/requisition-prefix.entity");
const requisition_sequence_entity_1 = require("../../database/entities/requisition-sequence.entity");
const requisition_item_approval_entity_1 = require("../../database/entities/requisition-item-approval.entity");
const company_entity_1 = require("../../database/entities/company.entity");
const project_entity_1 = require("../../database/entities/project.entity");
const operation_center_entity_1 = require("../../database/entities/operation-center.entity");
const project_code_entity_1 = require("../../database/entities/project-code.entity");
const material_entity_1 = require("../../database/entities/material.entity");
const material_group_entity_1 = require("../../database/entities/material-group.entity");
const user_entity_1 = require("../../database/entities/user.entity");
const role_entity_1 = require("../../database/entities/role.entity");
const authorization_entity_1 = require("../../database/entities/authorization.entity");
const supplier_entity_1 = require("../../database/entities/supplier.entity");
const requisition_item_quotation_entity_1 = require("../../database/entities/requisition-item-quotation.entity");
const purchase_order_entity_1 = require("../../database/entities/purchase-order.entity");
const purchase_order_item_entity_1 = require("../../database/entities/purchase-order-item.entity");
const purchase_order_sequence_entity_1 = require("../../database/entities/purchase-order-sequence.entity");
const purchase_order_status_entity_1 = require("../../database/entities/purchase-order-status.entity");
const material_receipt_entity_1 = require("../../database/entities/material-receipt.entity");
const material_price_history_entity_1 = require("../../database/entities/material-price-history.entity");
const purchase_order_approval_entity_1 = require("../../database/entities/purchase-order-approval.entity");
const purchase_order_item_approval_entity_1 = require("../../database/entities/purchase-order-item-approval.entity");
let PurchasesModule = class PurchasesModule {
};
exports.PurchasesModule = PurchasesModule;
exports.PurchasesModule = PurchasesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                requisition_entity_1.Requisition,
                requisition_item_entity_1.RequisitionItem,
                requisition_log_entity_1.RequisitionLog,
                requisition_status_entity_1.RequisitionStatus,
                requisition_prefix_entity_1.RequisitionPrefix,
                requisition_sequence_entity_1.RequisitionSequence,
                requisition_item_approval_entity_1.RequisitionItemApproval,
                company_entity_1.Company,
                project_entity_1.Project,
                operation_center_entity_1.OperationCenter,
                project_code_entity_1.ProjectCode,
                material_entity_1.Material,
                material_group_entity_1.MaterialGroup,
                user_entity_1.User,
                role_entity_1.Role,
                authorization_entity_1.Authorization,
                supplier_entity_1.Supplier,
                requisition_item_quotation_entity_1.RequisitionItemQuotation,
                purchase_order_entity_1.PurchaseOrder,
                purchase_order_item_entity_1.PurchaseOrderItem,
                purchase_order_sequence_entity_1.PurchaseOrderSequence,
                purchase_order_status_entity_1.PurchaseOrderStatus,
                material_receipt_entity_1.MaterialReceipt,
                material_price_history_entity_1.MaterialPriceHistory,
                purchase_order_approval_entity_1.PurchaseOrderApproval,
                purchase_order_item_approval_entity_1.PurchaseOrderItemApproval,
            ]),
        ],
        controllers: [master_data_controller_1.MasterDataController, purchases_controller_1.PurchasesController],
        providers: [purchases_service_1.PurchasesService],
        exports: [purchases_service_1.PurchasesService],
    })
], PurchasesModule);
//# sourceMappingURL=purchases.module.js.map