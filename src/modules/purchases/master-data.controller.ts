import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../database/entities/company.entity';
import { Project } from '../../database/entities/project.entity';
import { Material } from '../../database/entities/material.entity';
import { MaterialGroup } from '../../database/entities/material-group.entity';
import { RequisitionStatus } from '../../database/entities/requisition-status.entity';
import { OperationCenter } from '../../database/entities/operation-center.entity';
import { ProjectCode } from '../../database/entities/project-code.entity';

@ApiTags('Purchases - Master Data')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('purchases/master-data')
export class MasterDataController {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(MaterialGroup)
    private readonly materialGroupRepository: Repository<MaterialGroup>,
    @InjectRepository(RequisitionStatus)
    private readonly statusRepository: Repository<RequisitionStatus>,
    @InjectRepository(OperationCenter)
    private readonly operationCenterRepository: Repository<OperationCenter>,
    @InjectRepository(ProjectCode)
    private readonly projectCodeRepository: Repository<ProjectCode>,
  ) {}

  @Get('companies')
  @ApiOperation({
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
  })
  @ApiResponse({
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
  })
  async getCompanies() {
    const companies = await this.companyRepository.find({
      order: { name: 'ASC' },
    });

    return {
      data: companies,
      total: companies.length,
    };
  }

  @Get('projects')
  @ApiOperation({
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
  })
  @ApiResponse({
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
  })
  async getProjects(@Query('companyId') companyId?: string) {
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

  @Get('operation-centers')
  @ApiOperation({
    summary: 'Obtener todos los centros de operación',
    description: 'Retorna la lista de centros de operación disponibles',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de centros de operación retornada exitosamente',
  })
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

  @Get('project-codes')
  @ApiOperation({
    summary: 'Obtener todos los códigos de proyecto',
    description: 'Retorna la lista de códigos de proyecto disponibles',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de códigos de proyecto retornada exitosamente',
  })
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

  @Get('material-groups')
  @ApiOperation({
    summary: 'Obtener grupos de materiales',
    description: 'Retorna la lista de grupos de materiales disponibles',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de grupos de materiales retornada exitosamente',
  })
  async getMaterialGroups() {
    const groups = await this.materialGroupRepository.find({
      order: { name: 'ASC' },
    });

    return {
      data: groups,
      total: groups.length,
    };
  }

  @Get('materials')
  @ApiOperation({
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
  })
  @ApiResponse({
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
  })
  async getMaterials(@Query('groupId') groupId?: string) {
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

  @Get('statuses')
  @ApiOperation({
    summary: 'Obtener estados de requisición',
    description:
      'Retorna la lista de estados posibles para las requisiciones ordenados por secuencia de flujo',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de estados retornada exitosamente',
  })
  async getStatuses() {
    const statuses = await this.statusRepository.find({
      order: { order: 'ASC' },
    });

    return {
      data: statuses,
      total: statuses.length,
    };
  }
}
