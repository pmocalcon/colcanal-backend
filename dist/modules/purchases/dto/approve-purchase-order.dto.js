"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovePurchaseOrderDto = exports.ItemApprovalDto = exports.ItemApprovalDecision = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var ItemApprovalDecision;
(function (ItemApprovalDecision) {
    ItemApprovalDecision["APPROVED"] = "approved";
    ItemApprovalDecision["REJECTED"] = "rejected";
})(ItemApprovalDecision || (exports.ItemApprovalDecision = ItemApprovalDecision = {}));
class ItemApprovalDto {
    poItemId;
    decision;
    comments;
}
exports.ItemApprovalDto = ItemApprovalDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ItemApprovalDto.prototype, "poItemId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ItemApprovalDecision),
    __metadata("design:type", String)
], ItemApprovalDto.prototype, "decision", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ItemApprovalDto.prototype, "comments", void 0);
class ApprovePurchaseOrderDto {
    items;
    generalComments;
    rejectionReason;
}
exports.ApprovePurchaseOrderDto = ApprovePurchaseOrderDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ItemApprovalDto),
    __metadata("design:type", Array)
], ApprovePurchaseOrderDto.prototype, "items", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ApprovePurchaseOrderDto.prototype, "generalComments", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ApprovePurchaseOrderDto.prototype, "rejectionReason", void 0);
//# sourceMappingURL=approve-purchase-order.dto.js.map