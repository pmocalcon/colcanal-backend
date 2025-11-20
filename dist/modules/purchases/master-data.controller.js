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
exports.MasterDataController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const company_entity_1 = require("../../database/entities/company.entity");
const project_entity_1 = require("../../database/entities/project.entity");
const material_entity_1 = require("../../database/entities/material.entity");
const material_group_entity_1 = require("../../database/entities/material-group.entity");
const requisition_status_entity_1 = require("../../database/entities/requisition-status.entity");
const operation_center_entity_1 = require("../../database/entities/operation-center.entity");
const project_code_entity_1 = require("../../database/entities/project-code.entity");
let MasterDataController = class MasterDataController {
    companyRepository;
    projectRepository;
    materialRepository;
    materialGroupRepository;
    statusRepository;
    operationCenterRepository;
    projectCodeRepository;
    constructor(companyRepository, projectRepository, materialRepository, materialGroupRepository, statusRepository, operationCenterRepository, projectCodeRepository) {
        this.companyRepository = companyRepository;
        this.projectRepository = projectRepository;
        this.materialRepository = materialRepository;
        this.materialGroupRepository = materialGroupRepository;
        this.statusRepository = statusRepository;
        this.operationCenterRepository = operationCenterRepository;
        this.projectCodeRepository = projectCodeRepository;
    }
    async getCompanies() {
        const companies = await this.companyRepository.find({
            order: { name: 'ASC' },
        });
        return {
            data: companies,
            total: companies.length,
        };
    }
    async getProjects(companyId) {
        const where = companyId ? { companyId: parseInt(companyId) } : {};
        const projects = await this.projectRepository.find({
            where,
            relations: ['company'],
            order: { name: 'ASC' },
        });
        return {
            data: projects,
            total: projects.length,
        };
    }
    async getOperationCenters() {
        const centers = await this.operationCenterRepository.find({
            relations: ['company', 'project'],
            order: { code: 'ASC' },
        });
        return {
            data: centers,
            total: centers.length,
        };
    }
    async getProjectCodes() {
        const codes = await this.projectCodeRepository.find({
            relations: ['company', 'project'],
            order: { code: 'ASC' },
        });
        return {
            data: codes,
            total: codes.length,
        };
    }
    async getMaterialGroups() {
        const groups = await this.materialGroupRepository.find({
            order: { name: 'ASC' },
        });
        return {
            data: groups,
            total: groups.length,
        };
    }
    async getMaterials(groupId) {
        const where = groupId ? { groupId: parseInt(groupId) } : {};
        const materials = await this.materialRepository.find({
            where,
            relations: ['materialGroup'],
            order: { code: 'ASC' },
        });
        return {
            data: materials,
            total: materials.length,
        };
    }
    async getStatuses() {
        const statuses = await this.statusRepository.find({
            order: { order: 'ASC' },
        });
        return {
            data: statuses,
            total: statuses.length,
        };
    }
};
exports.MasterDataController = MasterDataController;
__decorate([
    (0, common_1.Get)('companies'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener todas las empresas',
        description: `
    Retorna la lista de todas las empresas disponibles para crear requisiciones.

    ## Uso en el formulario

    Este endpoint se usa para llenar el dropdown/select de "Empresa" en el formulario de creación de requisición.

    ## Datos retornados

    Cada empresa incluye:
    - **companyId**: ID único de la empresa (usar como value del select)
    - **name**: Nombre de la empresa (mostrar en el label del select)

    ## Ejemplo de uso en frontend

    \`\`\`typescript
    // React/Vue/Angular
    const { data: companies } = await fetch('/api/purchases/master-data/companies')

    // Renderizar select
    <select name="companyId">
      {companies.map(company => (
        <option value={company.companyId}>{company.name}</option>
      ))}
    </select>
    \`\`\`
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de empresas retornada exitosamente',
        schema: {
            example: {
                data: [
                    {
                        companyId: 1,
                        name: 'Canales & Contactos',
                    },
                    {
                        companyId: 2,
                        name: 'UT El Cerrito',
                    },
                    {
                        companyId: 3,
                        name: 'UT Circasia',
                    },
                ],
                total: 8,
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getCompanies", null);
__decorate([
    (0, common_1.Get)('projects'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener proyectos (opcionalmente filtrados por empresa)',
        description: `
    Retorna la lista de proyectos disponibles para crear requisiciones.

    ## Uso en el formulario

    Este endpoint se usa para llenar el dropdown/select de "Proyecto" en el formulario de requisición.

    ### Opción 1: Obtener todos los proyectos
    \`\`\`
    GET /api/purchases/master-data/projects
    \`\`\`

    ### Opción 2: Filtrar por empresa (Recomendado)
    Cuando el usuario selecciona una empresa en el formulario, hacer:
    \`\`\`
    GET /api/purchases/master-data/projects?companyId=1
    \`\`\`

    ## Comportamiento

    - **Sin filtro**: Retorna todos los proyectos de todas las empresas
    - **Con companyId**: Retorna solo los proyectos de esa empresa

    ## Nota importante

    - **Canales & Contactos** (companyId: 1) tiene 5 proyectos
    - **Uniones Temporales** (companyId: 2-8) NO tienen proyectos

    ## Ejemplo de uso en frontend

    \`\`\`typescript
    // Cuando el usuario selecciona una empresa
    const handleCompanyChange = async (companyId) => {
      const { data: projects } = await fetch(
        \`/api/purchases/master-data/projects?companyId=\${companyId}\`
      )

      // Actualizar opciones del select de proyectos
      setProjectOptions(projects)
    }
    \`\`\`
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de proyectos retornada exitosamente',
        schema: {
            example: {
                data: [
                    {
                        projectId: 1,
                        name: 'Administrativo',
                        companyId: 1,
                        company: {
                            companyId: 1,
                            name: 'Canales & Contactos',
                        },
                    },
                    {
                        projectId: 2,
                        name: 'Ciudad Bolívar',
                        companyId: 1,
                        company: {
                            companyId: 1,
                            name: 'Canales & Contactos',
                        },
                    },
                ],
                total: 5,
            },
        },
    }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getProjects", null);
__decorate([
    (0, common_1.Get)('operation-centers'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener todos los centros de operación',
        description: 'Retorna la lista de centros de operación disponibles',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de centros de operación retornada exitosamente',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getOperationCenters", null);
__decorate([
    (0, common_1.Get)('project-codes'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener todos los códigos de proyecto',
        description: 'Retorna la lista de códigos de proyecto disponibles',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de códigos de proyecto retornada exitosamente',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getProjectCodes", null);
__decorate([
    (0, common_1.Get)('material-groups'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener grupos de materiales',
        description: 'Retorna la lista de grupos de materiales disponibles',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de grupos de materiales retornada exitosamente',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getMaterialGroups", null);
__decorate([
    (0, common_1.Get)('materials'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener materiales (opcionalmente filtrados por grupo)',
        description: `
    Retorna la lista de materiales disponibles para agregar a requisiciones.

    ## Uso en el formulario

    Este endpoint se usa para:
    1. Llenar el buscador/autocomplete de materiales al agregar ítems a la requisición
    2. Mostrar el catálogo completo de materiales disponibles
    3. Filtrar materiales por grupo (opcional)

    ### Opción 1: Obtener todos los materiales
    \`\`\`
    GET /api/purchases/master-data/materials
    \`\`\`

    ### Opción 2: Filtrar por grupo
    \`\`\`
    GET /api/purchases/master-data/materials?groupId=1
    \`\`\`

    ## Datos retornados

    Cada material incluye:
    - **materialId**: ID único (usar en el array items al crear requisición)
    - **code**: Código SAP del material (ej: ELEC-001)
    - **description**: Descripción completa (ej: Cable #10 AWG)
    - **materialGroup**: Grupo al que pertenece (Eléctrico, Construcción, etc.)

    ## Grupos disponibles

    - **1**: Eléctrico (cables, breakers, etc.)
    - **2**: Construcción (cemento, postes, etc.)
    - **3**: Herramientas (alicates, destornilladores, etc.)
    - **4**: Suministros de Oficina (papel, carpetas, etc.)
    - **5**: Iluminación (lámparas LED, reflectores, etc.)
    - **6**: Seguridad Industrial

    ## Ejemplo de uso en frontend

    \`\`\`typescript
    // Autocomplete de materiales
    const searchMaterials = async (query) => {
      const { data: materials } = await fetch('/api/purchases/master-data/materials')

      // Filtrar por query localmente
      return materials.filter(m =>
        m.description.toLowerCase().includes(query.toLowerCase()) ||
        m.code.toLowerCase().includes(query.toLowerCase())
      )
    }

    // Al seleccionar un material, agregarlo al formulario
    const addMaterial = (material) => {
      setItems([...items, {
        materialId: material.materialId,
        quantity: 1,
        observation: ''
      }])
    }
    \`\`\`
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de materiales retornada exitosamente',
        schema: {
            example: {
                data: [
                    {
                        materialId: 1,
                        code: 'ELEC-001',
                        description: 'Cable #10 AWG',
                        materialGroup: {
                            groupId: 1,
                            name: 'Eléctrico',
                        },
                    },
                    {
                        materialId: 2,
                        code: 'ELEC-002',
                        description: 'Cable #12 AWG',
                        materialGroup: {
                            groupId: 1,
                            name: 'Eléctrico',
                        },
                    },
                    {
                        materialId: 8,
                        code: 'OFIC-001',
                        description: 'Resma papel carta',
                        materialGroup: {
                            groupId: 4,
                            name: 'Suministros de Oficina',
                        },
                    },
                ],
                total: 12,
            },
        },
    }),
    __param(0, (0, common_1.Query)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getMaterials", null);
__decorate([
    (0, common_1.Get)('statuses'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener estados de requisición',
        description: 'Retorna la lista de estados posibles para las requisiciones ordenados por secuencia de flujo',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de estados retornada exitosamente',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getStatuses", null);
exports.MasterDataController = MasterDataController = __decorate([
    (0, swagger_1.ApiTags)('Purchases - Master Data'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('purchases/master-data'),
    __param(0, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(1, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(2, (0, typeorm_1.InjectRepository)(material_entity_1.Material)),
    __param(3, (0, typeorm_1.InjectRepository)(material_group_entity_1.MaterialGroup)),
    __param(4, (0, typeorm_1.InjectRepository)(requisition_status_entity_1.RequisitionStatus)),
    __param(5, (0, typeorm_1.InjectRepository)(operation_center_entity_1.OperationCenter)),
    __param(6, (0, typeorm_1.InjectRepository)(project_code_entity_1.ProjectCode)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], MasterDataController);
//# sourceMappingURL=master-data.controller.js.map