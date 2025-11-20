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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchasesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const get_user_decorator_1 = require("../../common/decorators/get-user.decorator");
const purchases_service_1 = require("./purchases.service");
const create_requisition_dto_1 = require("./dto/create-requisition.dto");
const update_requisition_dto_1 = require("./dto/update-requisition.dto");
const filter_requisitions_dto_1 = require("./dto/filter-requisitions.dto");
const review_requisition_dto_1 = require("./dto/review-requisition.dto");
const approve_requisition_dto_1 = require("./dto/approve-requisition.dto");
const manage_quotation_dto_1 = require("./dto/manage-quotation.dto");
const create_purchase_orders_dto_1 = require("./dto/create-purchase-orders.dto");
const create_material_receipt_dto_1 = require("./dto/create-material-receipt.dto");
const update_material_receipt_dto_1 = require("./dto/update-material-receipt.dto");
const approve_purchase_order_dto_1 = require("./dto/approve-purchase-order.dto");
const user_entity_1 = require("../../database/entities/user.entity");
let PurchasesController = class PurchasesController {
    purchasesService;
    constructor(purchasesService) {
        this.purchasesService = purchasesService;
    }
    async createRequisition(user, createRequisitionDto) {
        return this.purchasesService.createRequisition(user.userId, createRequisitionDto);
    }
    async getMyRequisitions(user, filters) {
        return this.purchasesService.getMyRequisitions(user.userId, filters);
    }
    async getPendingActions(user, filters) {
        return this.purchasesService.getPendingActions(user.userId, filters);
    }
    async getRequisitionsForQuotation(user, filters) {
        return this.purchasesService.getRequisitionsForQuotation(user.userId, filters);
    }
    async getMyPendingReceipts(user, filters) {
        return this.purchasesService.getMyPendingReceipts(user.userId, filters);
    }
    async getRequisitionById(user, id) {
        return this.purchasesService.getRequisitionById(id, user.userId);
    }
    async updateRequisition(user, id, updateRequisitionDto) {
        return this.purchasesService.updateRequisition(id, user.userId, updateRequisitionDto);
    }
    async deleteRequisition(user, id) {
        return this.purchasesService.deleteRequisition(id, user.userId);
    }
    async reviewRequisition(user, id, reviewDto) {
        return this.purchasesService.reviewRequisition(id, user.userId, reviewDto);
    }
    async approveRequisition(user, id, approveDto) {
        return this.purchasesService.approveRequisition(id, user.userId, approveDto);
    }
    async getItemApprovals(id, approvalLevel) {
        return this.purchasesService.getItemApprovals(id, approvalLevel);
    }
    async rejectRequisition(user, id, rejectDto) {
        return this.purchasesService.rejectRequisitionByManager(id, user.userId, rejectDto);
    }
    async getRequisitionQuotation(user, id) {
        return this.purchasesService.getRequisitionQuotation(id, user.userId);
    }
    async manageQuotation(user, id, manageQuotationDto) {
        return this.purchasesService.manageQuotation(id, user.userId, manageQuotationDto);
    }
    async assignPrices(user, id, assignPricesDto) {
        return this.purchasesService.assignPrices(id, user.userId, assignPricesDto);
    }
    async createPurchaseOrders(user, id, createPurchaseOrdersDto) {
        return this.purchasesService.createPurchaseOrders(id, user.userId, createPurchaseOrdersDto);
    }
    async getRequisitionReceipts(user, id) {
        return this.purchasesService.getRequisitionReceipts(id, user.userId);
    }
    async createMaterialReceipts(user, id, createMaterialReceiptDto) {
        return this.purchasesService.createMaterialReceipts(id, user.userId, createMaterialReceiptDto);
    }
    async updateMaterialReceipt(user, id, receiptId, updateMaterialReceiptDto) {
        return this.purchasesService.updateMaterialReceipt(id, receiptId, user.userId, updateMaterialReceiptDto);
    }
    async getAllPurchaseOrders(user, page = 1, limit = 10, requisitionId, supplierId, fromDate, toDate) {
        const filters = {};
        if (requisitionId) {
            filters.requisitionId = parseInt(requisitionId);
        }
        if (supplierId) {
            filters.supplierId = parseInt(supplierId);
        }
        if (fromDate) {
            filters.fromDate = fromDate;
        }
        if (toDate) {
            filters.toDate = toDate;
        }
        return this.purchasesService.getPurchaseOrders(user.userId, page, limit, filters);
    }
    async getPendingPurchaseOrdersForApproval(user, page = 1, limit = 10) {
        return this.purchasesService.getPendingPurchaseOrdersForApproval(user.userId, page, limit);
    }
    async getPurchaseOrderForApproval(user, id) {
        return this.purchasesService.getPurchaseOrderForApproval(id, user.userId);
    }
    async approvePurchaseOrder(user, id, approvePurchaseOrderDto) {
        return this.purchasesService.approvePurchaseOrder(id, user.userId, approvePurchaseOrderDto);
    }
    async rejectPurchaseOrder(user, id, rejectionReason) {
        return this.purchasesService.rejectPurchaseOrder(id, user.userId, rejectionReason);
    }
    async resubmitPurchaseOrder(user, id, comments) {
        return this.purchasesService.resubmitPurchaseOrder(id, user.userId, comments);
    }
    async getPurchaseOrderDetail(user, id) {
        return this.purchasesService.getPurchaseOrderById(id);
    }
    async getPurchaseOrdersByRequisition(user, id) {
        return this.purchasesService.getPurchaseOrdersByRequisition(id, user.userId);
    }
    async getLatestMaterialPrice(materialId, supplierId) {
        return this.purchasesService.getLatestMaterialPrice(materialId, supplierId);
    }
};
exports.PurchasesController = PurchasesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Crear nueva requisición de compra',
        description: `
    Crea una nueva requisición de compra con numeración automática según empresa/proyecto.

    ## ¿Quién puede crear requisiciones?

    Solo los siguientes roles pueden crear requisiciones:
    - **Analistas PMO**: Requisiciones de proyectos
    - **PQRS**: Requisiciones de atención al cliente
    - **Directores**: Requisiciones especiales

    ❌ **NO pueden crear**: Gerencia y Compras (solo revisan/aprueban)

    ## Numeración automática

    El sistema genera automáticamente el número de requisición basado en:
    - **Empresa seleccionada** (companyId)
    - **Proyecto seleccionado** (projectId, si aplica)

    Ejemplos de números generados:
    - \`CB-0001\` → Canales & Contactos, Proyecto Ciudad Bolívar
    - \`ADM-0001\` → Canales & Contactos, Proyecto Administrativo
    - \`CE-0001\` → UT El Cerrito (sin proyecto)

    ## Estado inicial

    La requisición se crea en estado **"Pendiente"** y queda en espera de:
    1. **Revisión** por un Director (Nivel 1)
    2. **Aprobación** por Gerencia (Nivel 2)

    ## Ejemplo completo de request

    \`\`\`json
    {
      "companyId": 1,
      "projectId": 2,
      "items": [
        {
          "materialId": 1,
          "quantity": 10,
          "observation": "Cable #10 para instalación principal"
        },
        {
          "materialId": 3,
          "quantity": 5,
          "observation": "Breakers para tablero secundario"
        }
      ]
    }
    \`\`\`
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Requisición creada exitosamente con número automático',
        schema: {
            example: {
                requisitionId: 1,
                requisitionNumber: 'CB-0001',
                status: 'pendiente',
                companyId: 1,
                projectId: 2,
                operationCenterId: 2,
                projectCodeId: 2,
                createdBy: 5,
                createdAt: '2025-11-06T01:30:00.000Z',
                items: [
                    {
                        itemId: 1,
                        itemNumber: 1,
                        materialId: 1,
                        quantity: 10,
                        observation: 'Cable #10 para instalación principal',
                        material: {
                            materialId: 1,
                            code: 'ELEC-001',
                            description: 'Cable #10 AWG',
                        },
                    },
                    {
                        itemId: 2,
                        itemNumber: 2,
                        materialId: 3,
                        quantity: 5,
                        observation: 'Breakers para tablero secundario',
                        material: {
                            materialId: 3,
                            code: 'ELEC-003',
                            description: 'Breaker 2x20A',
                        },
                    },
                ],
                company: {
                    companyId: 1,
                    name: 'Canales & Contactos',
                },
                project: {
                    projectId: 2,
                    name: 'Ciudad Bolívar',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Datos de entrada inválidos. Causas posibles:\n' +
            '- companyId o projectId no existen\n' +
            '- materialId no existe\n' +
            '- No se encontró prefijo para empresa/proyecto\n' +
            '- Items vacío o sin al menos un elemento',
        schema: {
            example: {
                statusCode: 400,
                message: [
                    'No se encontró prefijo para companyId=1, projectId=99. Verifica que exista un prefijo configurado para esta combinación.',
                ],
                error: 'Bad Request',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Usuario no tiene permisos para crear requisiciones. Solo Analistas, PQRS y Directores pueden crear.',
        schema: {
            example: {
                statusCode: 403,
                message: 'Los usuarios con rol Gerencia o Compras no pueden crear requisiciones',
                error: 'Forbidden',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'No autorizado. Token inválido o expirado.',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        create_requisition_dto_1.CreateRequisitionDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "createRequisition", null);
__decorate([
    (0, common_1.Get)('my-requisitions'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener mis requisiciones creadas',
        description: `
    Retorna todas las requisiciones creadas por el usuario autenticado.

    ## Características

    - **Paginación**: Usa \`page\` y \`limit\` para navegar por páginas
    - **Filtros disponibles**: estado, rango de fechas, proyecto
    - **Ordenamiento**: Por fecha de creación (más recientes primero)
    - **Datos completos**: Incluye ítems, materiales, empresa, proyecto

    ## Ejemplos de uso

    - Ver todas mis requisiciones: \`GET /my-requisitions\`
    - Solo pendientes: \`GET /my-requisitions?status=pendiente\`
    - Página 2, 20 por página: \`GET /my-requisitions?page=2&limit=20\`
    - Por rango de fechas: \`GET /my-requisitions?fromDate=2025-01-01&toDate=2025-12-31\`
    - De un proyecto específico: \`GET /my-requisitions?projectId=2\`

    ## Estados posibles

    - \`pendiente\`: Esperando revisión
    - \`aprobada_revisor\`: Aprobada por Director
    - \`rechazada_revisor\`: Rechazada por Director
    - \`aprobada_gerencia\`: Aprobada por Gerencia (final)
    - \`rechazada_gerencia\`: Rechazada por Gerencia
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de requisiciones retornada exitosamente',
        schema: {
            example: {
                data: [
                    {
                        requisitionId: 1,
                        requisitionNumber: 'CB-0001',
                        status: 'pendiente',
                        companyId: 1,
                        projectId: 2,
                        createdAt: '2025-11-06T01:30:00.000Z',
                        items: [
                            {
                                itemId: 1,
                                materialId: 1,
                                quantity: 10,
                                observation: 'Cable #10 para instalación principal',
                                material: {
                                    code: 'ELEC-001',
                                    description: 'Cable #10 AWG',
                                },
                            },
                        ],
                        company: {
                            name: 'Canales & Contactos',
                        },
                        project: {
                            name: 'Ciudad Bolívar',
                        },
                    },
                ],
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'No autorizado. Token inválido o expirado.',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        filter_requisitions_dto_1.FilterRequisitionsDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getMyRequisitions", null);
__decorate([
    (0, common_1.Get)('pending-actions'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener requisiciones pendientes de acción',
        description: 'Retorna las requisiciones que requieren revisión o aprobación del usuario actual según su rol y autorizaciones',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de requisiciones pendientes retornada exitosamente',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        filter_requisitions_dto_1.FilterRequisitionsDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getPendingActions", null);
__decorate([
    (0, common_1.Get)('for-quotation'),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar requisiciones listas para cotización (Compras)',
        description: `
    Retorna todas las requisiciones aprobadas por gerencia que están listas para asignar cotizaciones.

    ## ¿Quién puede usar este endpoint?

    Solo usuarios con **rol Compras** pueden acceder a este endpoint.

    ## ¿Qué requisiciones se muestran?

    - Requisiciones en estado **"aprobada_gerencia"**
    - Ordenadas por fecha de creación (más antiguas primero)
    - Incluye todos los ítems con sus materiales

    ## Características

    - **Paginación**: Usa \`page\` y \`limit\` para navegar por páginas
    - **Datos completos**: Incluye empresa, proyecto, creador, ítems
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de requisiciones retornada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No tiene permisos. Solo el rol Compras puede acceder.',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        filter_requisitions_dto_1.FilterRequisitionsDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getRequisitionsForQuotation", null);
__decorate([
    (0, common_1.Get)('my-pending-receipts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar mis requisiciones pendientes de recepción',
        description: `
    Retorna todas las requisiciones creadas por el usuario que están pendientes de recibir materiales.

    ## ¿Quién puede usar este endpoint?

    Solo el **creador de la requisición** puede ver sus propias requisiciones pendientes.

    ## ¿Qué requisiciones se muestran?

    - Requisiciones en estado **"pendiente_recepcion"** (sin recepciones aún)
    - Requisiciones en estado **"en_recepcion"** (con recepciones parciales)

    ## Información incluida

    - Datos completos de la requisición
    - Órdenes de compra con proveedores
    - Ítems con:
      - Cantidad ordenada
      - Cantidad recibida (suma de todas las recepciones)
      - Cantidad pendiente
      - Lista de recepciones realizadas
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de requisiciones pendientes retornada exitosamente',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        filter_requisitions_dto_1.FilterRequisitionsDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getMyPendingReceipts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener detalle de requisición',
        description: 'Retorna el detalle completo de una requisición específica con todos sus ítems y logs',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Detalle de requisición retornado exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getRequisitionById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Actualizar requisición',
        description: 'Actualiza una requisición existente. Solo el creador puede editarla y únicamente si está en estado "Pendiente", "Rechazada por Revisor" o "Rechazada por Gerencia"',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición a actualizar',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Requisición actualizada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No tiene permisos para editar esta requisición',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, update_requisition_dto_1.UpdateRequisitionDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "updateRequisition", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Eliminar requisición',
        description: 'Elimina una requisición. Solo el creador puede eliminarla y únicamente si está en estado "Pendiente"',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición a eliminar',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Requisición eliminada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No tiene permisos para eliminar esta requisición',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "deleteRequisition", null);
__decorate([
    (0, common_1.Post)(':id/review'),
    (0, swagger_1.ApiOperation)({
        summary: 'Revisar requisición (Directores)',
        description: 'Permite a los Directores aprobar o rechazar una requisición en revisión. Solo usuarios con autorización de nivel 1 pueden revisar.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición a revisar',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Requisición revisada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'La requisición no está en estado válido para revisión',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No tiene permisos para revisar esta requisición',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, review_requisition_dto_1.ReviewRequisitionDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "reviewRequisition", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, swagger_1.ApiOperation)({
        summary: 'Aprobar requisición (Gerencia)',
        description: 'Permite a la Gerencia aprobar una requisición que ya fue revisada por un Director. Solo usuarios con rol de Gerencia pueden aprobar.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición a aprobar',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Requisición aprobada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'La requisición no está en estado válido para aprobación',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No tiene permisos para aprobar esta requisición',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, approve_requisition_dto_1.ApproveRequisitionDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "approveRequisition", null);
__decorate([
    (0, common_1.Get)(':id/item-approvals'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener aprobaciones de ítems previas',
        description: 'Permite obtener las aprobaciones previas a nivel de ítem para una requisición. Útil para pre-cargar decisiones cuando se revisa/aprueba una requisición nuevamente.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición',
        type: Number,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'approvalLevel',
        description: 'Nivel de aprobación a filtrar (reviewer o management)',
        required: false,
        enum: ['reviewer', 'management'],
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de aprobaciones de ítems',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('approvalLevel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getItemApprovals", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, swagger_1.ApiOperation)({
        summary: 'Rechazar requisición (Gerencia)',
        description: 'Permite a la Gerencia rechazar una requisición que ya fue revisada por un Director. Los comentarios son obligatorios.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición a rechazar',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Requisición rechazada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'La requisición no está en estado válido para rechazo',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No tiene permisos para rechazar esta requisición',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, approve_requisition_dto_1.RejectRequisitionDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "rejectRequisition", null);
__decorate([
    (0, common_1.Get)(':id/quotation'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener detalle de requisición con cotizaciones (Compras)',
        description: `
    Retorna el detalle completo de una requisición con su información de cotización actual.

    ## ¿Quién puede usar este endpoint?

    Solo usuarios con **rol Compras** pueden acceder a este endpoint.

    ## ¿Qué información retorna?

    - Datos completos de la requisición
    - Ítems con sus materiales
    - **Cotizaciones activas** (última versión) de cada ítem:
      - Acción asignada (cotizar / no_requiere)
      - Proveedores asignados (si aplica)
      - Justificación (si no requiere cotización)
      - Observaciones

    ## Estados válidos

    Se puede consultar si la requisición está en estado:
    - \`aprobada_gerencia\` (lista para cotizar)
    - \`en_cotizacion\` (en proceso de asignación)
    - \`cotizada\` (cotización completa, permite editar antes de crear orden)
    - \`en_orden_compra\` (tiene órdenes de compra creadas - solo visualización)
    - \`pendiente_recepcion\` (en proceso de recepción - solo visualización)
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Detalle de requisición con cotizaciones retornado exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'La requisición no está disponible para cotización',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No tiene permisos. Solo el rol Compras puede acceder.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getRequisitionQuotation", null);
__decorate([
    (0, common_1.Post)(':id/quotation'),
    (0, swagger_1.ApiOperation)({
        summary: 'Gestionar cotizaciones de una requisición (Compras)',
        description: `
    Permite asignar proveedores y acciones a los ítems de una requisición.

    ## ¿Quién puede usar este endpoint?

    Solo usuarios con **rol Compras** pueden acceder a este endpoint.

    ## ¿Qué hace este endpoint?

    - Asigna acción (\`cotizar\` o \`no_requiere\`) a cada ítem
    - Permite hasta **2 proveedores** por ítem
    - Implementa **versionamiento automático** al cambiar proveedores
    - Cambia estado a \`en_cotizacion\` automáticamente
    - Cambia a \`cotizada\` cuando **todos los ítems** tienen acción asignada

    ## Estados válidos

    Solo se puede gestionar si la requisición está en estado:
    - \`aprobada_gerencia\` (primera asignación)
    - \`en_cotizacion\` (modificar asignaciones parciales)
    - \`cotizada\` (modificar cotizaciones completas antes de crear orden)

    ## Ejemplo de request

    \`\`\`json
    {
      "items": [
        {
          "itemId": 1,
          "action": "cotizar",
          "suppliers": [
            {
              "supplierId": 3,
              "supplierOrder": 1,
              "observations": "Solicitar entrega en 5 días"
            },
            {
              "supplierId": 7,
              "supplierOrder": 2,
              "observations": "Proveedor alternativo"
            }
          ]
        },
        {
          "itemId": 2,
          "action": "no_requiere",
          "justification": "Material disponible en inventario"
        }
      ]
    }
    \`\`\`

    ## Versionamiento

    - Al cambiar proveedores de un ítem, se crea una **nueva versión**
    - Las versiones anteriores se marcan como \`isActive: false\`
    - Siempre se retorna solo la versión activa más reciente
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Cotizaciones actualizadas exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Datos inválidos o requisición no disponible para cotización',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No tiene permisos. Solo el rol Compras puede acceder.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, manage_quotation_dto_1.ManageQuotationDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "manageQuotation", null);
__decorate([
    (0, common_1.Post)(':id/assign-prices'),
    (0, swagger_1.ApiOperation)({
        summary: 'Asignar precios a las cotizaciones de una requisición',
        description: `
    Permite a Compras ingresar los precios unitarios, IVA y descuentos para cada ítem cotizado.

    ## Flujo

    1. Valida que la requisición esté en estado "cotizada"
    2. Verifica que no existan órdenes de compra ya creadas
    3. Guarda los precios en las cotizaciones seleccionadas
    4. Si hay múltiples proveedores por ítem, marca el seleccionado

    ## Características

    - Solo se asignan precios a ítems con action='cotizar'
    - Los ítems con action='no_requiere' no necesitan precio
    - El precio se guarda SIN IVA, el IVA se calcula al crear la orden
    - Permite modificar precios hasta que se cree la orden de compra

    ## Ejemplo de request

    \`\`\`json
    {
      "items": [
        {
          "itemId": 1,
          "quotationId": 5,
          "unitPrice": 150000,
          "hasIva": true,
          "discount": 5000
        },
        {
          "itemId": 2,
          "quotationId": 8,
          "unitPrice": 80000,
          "hasIva": false,
          "discount": 0
        }
      ]
    }
    \`\`\`
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Precios asignados exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Datos inválidos o requisición no disponible',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, Object]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "assignPrices", null);
__decorate([
    (0, common_1.Post)(':id/purchase-orders'),
    (0, swagger_1.ApiOperation)({
        summary: 'Crear órdenes de compra para una requisición cotizada',
        description: `
    Genera una o más órdenes de compra a partir de una requisición en estado "cotizada".

    ## Flujo

    1. Valida que la requisición esté en estado "cotizada"
    2. Agrupa automáticamente los ítems por proveedor
    3. Genera una orden de compra por cada proveedor con numeración automática
    4. Cambia el estado de la requisición a "pendiente_recepcion"
    5. Registra el log de la acción

    ## Numeración automática

    - Formato: \`{código}-{tipo}-{consecutivo}\`
    - **Código**: Código del centro de operación (ej: 001, 002, 960, 961)
    - **Tipo**: "OC" si el nombre de la empresa contiene "Unión Temporal", sino "OS"
    - **Consecutivo**: Número secuencial de 4 dígitos por centro de operación
    - Ejemplos: \`001-OC-0001\`, \`960-OS-0088\`

    ## Cálculos

    - **Subtotal**: cantidad × precio unitario
    - **IVA**: subtotal × 19% (si hasIVA es true)
    - **Total ítem**: subtotal + IVA - descuento
    - Los totales se calculan automáticamente por orden

    ## Ejemplo de request

    \`\`\`json
    {
      "issueDate": "2025-11-06",
      "items": [
        {
          "itemId": 1,
          "supplierId": 3,
          "unitPrice": 50000,
          "hasIVA": true,
          "discount": 5000
        },
        {
          "itemId": 2,
          "supplierId": 3,
          "unitPrice": 25000,
          "hasIVA": false,
          "discount": 0
        },
        {
          "itemId": 3,
          "supplierId": 5,
          "unitPrice": 120000,
          "hasIVA": true,
          "discount": 10000
        }
      ]
    }
    \`\`\`

    En este ejemplo se generarán 2 órdenes de compra:
    - Una para el proveedor 3 con los ítems 1 y 2
    - Una para el proveedor 5 con el ítem 3
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición cotizada',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Órdenes de compra creadas exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Requisición no está en estado "cotizada" o datos inválidos',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, create_purchase_orders_dto_1.CreatePurchaseOrdersDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "createPurchaseOrders", null);
__decorate([
    (0, common_1.Get)(':id/receipts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ver recepciones de una requisición',
        description: `
    Retorna el detalle completo de una requisición con todas sus recepciones de materiales.

    ## Permisos

    Solo el **creador de la requisición** puede ver sus recepciones.

    ## Estados válidos

    - \`pendiente_recepcion\`: Sin recepciones aún
    - \`en_recepcion\`: Con recepciones parciales
    - \`recepcion_completa\`: Todos los materiales recibidos

    ## Información retornada

    - Datos de la requisición
    - Órdenes de compra con ítems
    - Para cada ítem:
      - Cantidad ordenada
      - Cantidad recibida
      - Cantidad pendiente
      - Lista detallada de recepciones (fecha, cantidad, observaciones, quién recibió)
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Recepciones retornadas exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No tiene permiso para ver las recepciones de esta requisición',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'La requisición no está en proceso de recepción',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getRequisitionReceipts", null);
__decorate([
    (0, common_1.Post)(':id/receipts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Registrar recepción de materiales',
        description: `
    Permite registrar la recepción de uno o más ítems de una requisición.

    ## Permisos

    Solo el **creador de la requisición** puede registrar recepciones.

    ## Flujo

    1. Valida que la requisición esté en estado válido (\`pendiente_recepcion\` o \`en_recepcion\`)
    2. Valida que cada ítem pertenezca a la requisición
    3. Calcula cantidad pendiente vs recibida
    4. Si hay sobreentrega, **requiere justificación obligatoria**
    5. Crea las recepciones
    6. Actualiza estado automáticamente:
       - Si quedan ítems pendientes → \`en_recepcion\`
       - Si todos los ítems están completos → \`recepcion_completa\`

    ## Recepciones parciales

    ✅ Permitidas: Puedes recibir 5 de 10, luego 3 más, luego 2 más

    ## Sobreentrega

    ✅ Permitida con justificación: Si ordenaste 10 pero llegaron 12, debes justificar

    ## Ejemplo de request

    \`\`\`json
    {
      "items": [
        {
          "poItemId": 1,
          "quantityReceived": 5,
          "receivedDate": "2025-11-06",
          "observations": "Material en buen estado"
        },
        {
          "poItemId": 2,
          "quantityReceived": 12,
          "receivedDate": "2025-11-06",
          "overdeliveryJustification": "Proveedor envió de más por error",
          "observations": "2 unidades extra recibidas"
        }
      ]
    }
    \`\`\`
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Recepción registrada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Datos inválidos o sobreentrega sin justificación',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Solo el creador puede registrar recepciones',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, create_material_receipt_dto_1.CreateMaterialReceiptDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "createMaterialReceipts", null);
__decorate([
    (0, common_1.Patch)(':id/receipts/:receiptId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Actualizar una recepción de material',
        description: `
    Permite corregir los datos de una recepción ya registrada.

    ## Permisos

    Solo el **creador de la requisición** puede editar recepciones.

    ## ¿Qué se puede actualizar?

    - Cantidad recibida
    - Fecha de recepción
    - Observaciones
    - Justificación de sobreentrega

    ## Validaciones

    - Si la nueva cantidad genera sobreentrega, requiere justificación
    - Recalcula automáticamente el estado de la requisición

    ## Ejemplo

    \`\`\`json
    {
      "quantityReceived": 8,
      "observations": "Cantidad corregida después de reconteo"
    }
    \`\`\`
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición',
        type: Number,
    }),
    (0, swagger_1.ApiParam)({
        name: 'receiptId',
        description: 'ID de la recepción a actualizar',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Recepción actualizada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Solo el creador puede editar recepciones',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Param)('receiptId', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, Number, update_material_receipt_dto_1.UpdateMaterialReceiptDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "updateMaterialReceipt", null);
__decorate([
    (0, common_1.Get)('purchase-orders'),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar todas las órdenes de compra',
        description: `
    Obtiene un listado paginado de todas las órdenes de compra generadas.

    ## Filtros opcionales

    - **requisitionId**: Filtrar por requisición
    - **supplierId**: Filtrar por proveedor
    - **fromDate / toDate**: Filtrar por rango de fechas de emisión
    - **page / limit**: Paginación

    ## Ejemplo

    GET /purchases/purchase-orders?page=1&limit=10&supplierId=3

    ## Respuesta

    Incluye información completa de cada orden:
    - Datos de la requisición asociada
    - Información del proveedor
    - Usuario que creó la orden
    - Lista de ítems con materiales
    - Totales calculados
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de órdenes de compra obtenida exitosamente',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)('page', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('requisitionId')),
    __param(4, (0, common_1.Query)('supplierId')),
    __param(5, (0, common_1.Query)('fromDate')),
    __param(6, (0, common_1.Query)('toDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, Number, String, String, String, String]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getAllPurchaseOrders", null);
__decorate([
    (0, common_1.Get)('purchase-orders/pending-approval'),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar órdenes de compra para aprobación (Gerencia)',
        description: `
    Obtiene un listado paginado de todas las órdenes de compra pendientes, aprobadas y rechazadas por Gerencia.

    ## Restricción de acceso

    Solo usuarios con rol **Gerencia** pueden acceder a este endpoint.

    ## Estados incluidos

    - **pendiente_aprobacion_gerencia**: Órdenes pendientes de aprobar
    - **aprobada_gerencia**: Órdenes ya aprobadas
    - **rechazada_gerencia**: Órdenes rechazadas

    ## Información incluida

    - **Orden de compra**: Número, fecha de emisión, totales
    - **Requisición**: Número, empresa, proyecto
    - **Proveedor**: Nombre, NIT
    - **Ítems**: Lista de materiales con cantidades y precios
    - **Deadline**: Fecha límite de aprobación (1 día hábil)
    - **Estado de vencimiento**: Si está vencida o no
    - **Historial de aprobaciones**: Incluye rechazos previos

    ## Deadline

    Cada orden de compra tiene un plazo de **1 día hábil** desde su creación para ser aprobada.
    Las órdenes vencidas se marcan con \`isOverdue: true\` y se calcula \`daysOverdue\`.

    ## Ejemplo

    GET /purchases/requisitions/purchase-orders/pending-approval?page=1&limit=10
    `,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        type: Number,
        description: 'Número de página (default: 1)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Registros por página (default: 10)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de órdenes pendientes obtenida exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Solo el rol Gerencia puede acceder a este endpoint',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(2, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, Number]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getPendingPurchaseOrdersForApproval", null);
__decorate([
    (0, common_1.Get)('purchase-orders/:id/for-approval'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ver detalle de una orden de compra para aprobar (Gerencia)',
        description: `
    Obtiene el detalle completo de una orden de compra para su aprobación o rechazo.

    ## Restricción de acceso

    Solo usuarios con rol **Gerencia** pueden acceder a este endpoint.

    ## Información incluida

    - **Orden de compra completa**: Número, fecha, totales
    - **Requisición**: Información del proyecto y empresa
    - **Proveedor**: Datos completos
    - **Ítems detallados**:
      - Material (código, nombre, grupo, unidad de medida)
      - Cantidad solicitada
      - Precio unitario, IVA, descuento
      - Subtotal y total por ítem
      - Cotización original asociada
    - **Historial de aprobaciones**: Aprobaciones y rechazos previos
    - **Deadline**: Fecha límite y estado de vencimiento

    ## Uso típico

    Esta información se muestra en la pantalla de aprobación donde Gerencia puede:
    - Ver toda la información de la línea completa
    - Aprobar o rechazar cada ítem individualmente
    - Proporcionar comentarios y justificaciones

    ## Ejemplo

    GET /purchases/requisitions/purchase-orders/1/for-approval
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la orden de compra',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Detalle de la orden de compra obtenido exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Solo el rol Gerencia puede acceder a este endpoint',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Orden de compra no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getPurchaseOrderForApproval", null);
__decorate([
    (0, common_1.Post)('purchase-orders/:id/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Aprobar o rechazar ítems de una orden de compra (Gerencia)',
        description: `
    Procesa la aprobación o rechazo de una orden de compra con decisiones item por item.

    ## Restricción de acceso

    Solo usuarios con rol **Gerencia** pueden aprobar órdenes de compra.

    ## Lógica de aprobación

    - **Si TODOS los ítems son aprobados**: La orden de compra pasa a estado \`aprobada_gerencia\`
    - **Si ALGÚN ítem es rechazado**: La orden de compra pasa a estado \`rechazada_gerencia\`
    - **Cuando se rechaza**: Se debe proporcionar un \`rejectionReason\` obligatorio
    - **Contador de rechazos**: Se incrementa automáticamente en caso de rechazo

    ## Request Body

    \`\`\`json
    {
      "items": [
        {
          "poItemId": 1,
          "decision": "approved",
          "comments": "Precio correcto y dentro del presupuesto"
        },
        {
          "poItemId": 2,
          "decision": "rejected",
          "comments": "Precio muy alto, renegociar con proveedor"
        }
      ],
      "generalComments": "Revisar ítem 2 antes de reenviar",
      "rejectionReason": "El ítem 2 excede el presupuesto aprobado para materiales eléctricos"
    }
    \`\`\`

    ## Validaciones

    - Todos los ítems de la OC deben tener una decisión
    - Si hay rechazos, \`rejectionReason\` es obligatorio
    - La OC debe estar en estado \`pendiente_aprobacion_gerencia\`

    ## Resultado

    - Se crea un registro en \`purchase_order_approvals\`
    - Se crean registros individuales en \`purchase_order_item_approvals\`
    - Se actualiza el estado de la orden de compra
    - Si es rechazada, vuelve a Compras para corrección
    - Si es aprobada, puede pasar a recepción de materiales

    ## Ejemplo

    POST /purchases/requisitions/purchase-orders/1/approve
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la orden de compra',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Orden de compra procesada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Datos inválidos o falta justificación de rechazo',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Solo el rol Gerencia puede aprobar órdenes',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Orden de compra no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, approve_purchase_order_dto_1.ApprovePurchaseOrderDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "approvePurchaseOrder", null);
__decorate([
    (0, common_1.Post)('purchase-orders/:id/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Rechazar una orden de compra completa (Gerencia)',
        description: `
    Rechaza una orden de compra completa sin necesidad de revisar ítem por ítem.

    ## Restricción de acceso

    Solo usuarios con rol **Gerencia** pueden rechazar órdenes de compra.

    ## Cuándo usar este endpoint

    - Cuando toda la orden tiene problemas generales (ej: proveedor equivocado, fecha incorrecta)
    - Cuando no es necesario revisar cada ítem individualmente
    - Como alternativa más rápida a aprobar/rechazar item por item

    ## Request Body

    \`\`\`json
    {
      "rejectionReason": "Proveedor no está autorizado para este tipo de materiales. Favor cambiar proveedor y reenviar."
    }
    \`\`\`

    ## Validaciones

    - \`rejectionReason\` es obligatorio
    - La OC debe estar en estado \`pendiente_aprobacion_gerencia\`

    ## Resultado

    - Se crea un registro en \`purchase_order_approvals\` con estado rechazado
    - Todos los ítems se marcan como rechazados automáticamente
    - Se incrementa el contador de rechazos
    - La orden vuelve a Compras para corrección

    ## Ejemplo

    POST /purchases/requisitions/purchase-orders/1/reject
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la orden de compra',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Orden de compra rechazada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Falta la razón de rechazo',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Solo el rol Gerencia puede rechazar órdenes',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Orden de compra no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)('rejectionReason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, String]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "rejectPurchaseOrder", null);
__decorate([
    (0, common_1.Patch)('purchase-orders/:id/resubmit'),
    (0, swagger_1.ApiOperation)({
        summary: 'Reenviar una orden de compra rechazada (Compras)',
        description: `
    Reenvía una orden de compra que fue rechazada por Gerencia, después de realizar las correcciones necesarias.

    ## Restricción de acceso

    Solo usuarios con rol **Compras** pueden reenviar órdenes de compra.

    ## Flujo típico

    1. Gerencia rechaza una OC con justificación
    2. Compras recibe la notificación de rechazo
    3. Compras corrige los problemas (puede editar precios, cambiar proveedor, etc.)
    4. Compras usa este endpoint para reenviar la OC corregida a Gerencia
    5. La OC vuelve a estado \`pendiente_aprobacion_gerencia\`
    6. Gerencia puede revisarla nuevamente

    ## Request Body (opcional)

    \`\`\`json
    {
      "comments": "Se corrigió el precio del ítem 2 y se renegoci\u00f3 con el proveedor"
    }
    \`\`\`

    ## Validaciones

    - La OC debe estar en estado \`rechazada_gerencia\`
    - Solo Compras puede reenviar

    ## Resultado

    - El estado cambia de \`rechazada_gerencia\` a \`pendiente_aprobacion_gerencia\`
    - La OC vuelve a aparecer en la lista de pendientes de Gerencia
    - Se mantiene el historial de rechazos y aprobaciones previas

    ## Ejemplo

    PATCH /purchases/requisitions/purchase-orders/1/resubmit
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la orden de compra',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Orden de compra reenviada exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'La orden no está en estado rechazado',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Solo el rol Compras puede reenviar órdenes',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Orden de compra no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)('comments')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, String]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "resubmitPurchaseOrder", null);
__decorate([
    (0, common_1.Get)('purchase-orders/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ver detalle de una orden de compra',
        description: `
    Obtiene el detalle completo de una orden de compra específica.

    ## Información incluida

    - **Orden de compra**: Número, fecha, totales
    - **Requisición**: Número, empresa, proyecto, estado
    - **Proveedor**: Nombre, NIT, contacto
    - **Creador**: Usuario que generó la orden
    - **Ítems**:
      - Material (código, nombre, unidad)
      - Cantidad, precio unitario
      - Subtotal, IVA, descuento, total
      - Cotización asociada

    ## Ejemplo

    GET /purchases/purchase-orders/1
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la orden de compra',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Detalle de la orden de compra obtenido exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Orden de compra no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getPurchaseOrderDetail", null);
__decorate([
    (0, common_1.Get)(':id/purchase-orders'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ver órdenes de compra de una requisición',
        description: `
    Obtiene todas las órdenes de compra generadas para una requisición específica.

    ## Información incluida

    - **Datos de la requisición**: Número, estado
    - **Lista de órdenes de compra**:
      - Número de orden
      - Proveedor
      - Fecha de emisión
      - Ítems con materiales
      - Totales (subtotal, IVA, descuentos, total)

    ## Uso típico

    Mostrar todas las OCs generadas desde el detalle de una requisición.

    ## Ejemplo

    GET /purchases/requisitions/5/purchase-orders
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID de la requisición',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Órdenes de compra de la requisición obtenidas exitosamente',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Requisición no encontrada',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getPurchaseOrdersByRequisition", null);
__decorate([
    (0, common_1.Get)('materials/:materialId/latest-price/:supplierId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener último precio de material por proveedor',
        description: `
    Obtiene el precio más reciente de un material específico con un proveedor específico,
    basado en órdenes de compra previas.

    ## Uso típico

    Pre-poblar precios en la pantalla de asignación de precios para órdenes de compra,
    mostrando el último precio usado para facilitar la captura de datos.

    ## Retorna

    - **unitPrice**: Precio unitario sin IVA
    - **hasIva**: Si aplica IVA
    - **ivaPercentage**: Porcentaje de IVA
    - **discount**: Descuento aplicado
    - **lastUsedDate**: Fecha de la última orden de compra
    - **purchaseOrderNumber**: Número de la última orden de compra
    - **supplierName**: Nombre del proveedor

    ## Ejemplo

    GET /purchases/requisitions/materials/15/latest-price/3
    `,
    }),
    (0, swagger_1.ApiParam)({
        name: 'materialId',
        description: 'ID del material',
        type: Number,
    }),
    (0, swagger_1.ApiParam)({
        name: 'supplierId',
        description: 'ID del proveedor',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Precio obtenido exitosamente (puede ser null si no hay historial)',
    }),
    __param(0, (0, common_1.Param)('materialId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('supplierId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "getLatestMaterialPrice", null);
exports.PurchasesController = PurchasesController = __decorate([
    (0, swagger_1.ApiTags)('Purchases - Requisitions'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('purchases/requisitions'),
    __metadata("design:paramtypes", [purchases_service_1.PurchasesService])
], PurchasesController);
//# sourceMappingURL=purchases.controller.js.map