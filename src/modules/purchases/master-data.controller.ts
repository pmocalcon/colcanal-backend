import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  Query,
  Body,
  Param,
  ParseIntPipe,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CreateMaterialGroupDto } from './dto/create-material-group.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Company } from '../../database/entities/company.entity';
import { Project } from '../../database/entities/project.entity';
import { Material } from '../../database/entities/material.entity';
import { MaterialGroup } from '../../database/entities/material-group.entity';
import { MaterialCategory } from '../../database/entities/material-category.entity';
import { RequisitionStatus } from '../../database/entities/requisition-status.entity';
import { OperationCenter } from '../../database/entities/operation-center.entity';
import { ProjectCode } from '../../database/entities/project-code.entity';

@ApiTags('Purchases - Master Data')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('purchases/master-data')
export class MasterDataController {
  // Umbral de similitud (0.3 = 30% similar)
  private readonly SIMILARITY_THRESHOLD = 0.3;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(MaterialGroup)
    private readonly materialGroupRepository: Repository<MaterialGroup>,
    @InjectRepository(MaterialCategory)
    private readonly materialCategoryRepository: Repository<MaterialCategory>,
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

  @Get('material-categories')
  @ApiOperation({
    summary: 'Obtener categorías de materiales',
    description: `
    Retorna la lista de categorías de materiales disponibles.

    ## Nueva funcionalidad ✨

    Se ha implementado un sistema de categorización de materiales con 3 niveles jerárquicos:

    **MaterialCategory** → **MaterialGroup** → **Material**

    ### Ejemplo de jerarquía:
    \`\`\`
    Categoría: "Oficina"
      └── Grupo: "Papelería"
            └── Material: "Resma de papel"
      └── Grupo: "Implementos"
            └── Material: "Grapadora"
    \`\`\`

    ## Uso en el formulario

    Este endpoint se usa para:
    1. Mostrar filtros por categoría en la búsqueda de materiales
    2. Organizar el catálogo de materiales jerárquicamente
    3. Facilitar la navegación del usuario al seleccionar materiales

    ## Categoría "Pendiente"

    - Todos los grupos existentes están asignados a la categoría **"Pendiente"**
    - Esta categoría se usa temporalmente mientras se organizan los materiales
    - Podrán crear nuevas categorías según la organización necesite

    ## Ejemplo de uso en frontend

    \`\`\`typescript
    // Obtener categorías para filtro
    const { data: categories } = await fetch('/api/purchases/master-data/material-categories')

    // Al seleccionar una categoría, filtrar grupos
    const handleCategoryChange = async (categoryId) => {
      const { data: groups } = await fetch(
        \`/api/purchases/master-data/material-groups?categoryId=\${categoryId}\`
      )
      setGroupOptions(groups)
    }
    \`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías retornada exitosamente',
    schema: {
      example: {
        data: [
          {
            categoryId: 1,
            name: 'Pendiente',
            description: 'Categoría temporal para materiales sin categorizar',
          },
          {
            categoryId: 2,
            name: 'Oficina',
            description: 'Materiales y suministros de oficina',
          },
          {
            categoryId: 3,
            name: 'Eléctrico',
            description: 'Materiales eléctricos y componentes',
          },
        ],
        total: 3,
      },
    },
  })
  async getMaterialCategories() {
    const categories = await this.materialCategoryRepository.find({
      order: { name: 'ASC' },
    });

    return {
      data: categories,
      total: categories.length,
    };
  }

  @Get('material-groups')
  @ApiOperation({
    summary: 'Obtener grupos de materiales (opcionalmente filtrados por categoría)',
    description: `
    Retorna la lista de grupos de materiales disponibles.

    ## ⚠️ CAMBIO IMPORTANTE - Nueva estructura jerárquica

    Los grupos ahora pertenecen a una **categoría**. La jerarquía completa es:

    **MaterialCategory** → **MaterialGroup** → **Material**

    ### Opción 1: Obtener todos los grupos
    \`\`\`
    GET /api/purchases/master-data/material-groups
    \`\`\`

    ### Opción 2: Filtrar por categoría (Nuevo ✨)
    \`\`\`
    GET /api/purchases/master-data/material-groups?categoryId=1
    \`\`\`

    ## Datos retornados

    Cada grupo ahora incluye:
    - **groupId**: ID único del grupo
    - **name**: Nombre del grupo
    - **categoryId**: ID de la categoría a la que pertenece (NUEVO)
    - **category**: Objeto con datos de la categoría (NUEVO)
      - categoryId
      - name
      - description

    ## Ejemplo de uso en frontend

    \`\`\`typescript
    // Filtrado en cascada: Categoría → Grupo → Material

    // 1. Usuario selecciona categoría
    const handleCategorySelect = async (categoryId) => {
      const { data: groups } = await fetch(
        \`/api/purchases/master-data/material-groups?categoryId=\${categoryId}\`
      )
      setAvailableGroups(groups)
    }

    // 2. Usuario selecciona grupo
    const handleGroupSelect = async (groupId) => {
      const { data: materials } = await fetch(
        \`/api/purchases/master-data/materials?groupId=\${groupId}\`
      )
      setAvailableMaterials(materials)
    }
    \`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de grupos de materiales retornada exitosamente',
    schema: {
      example: {
        data: [
          {
            groupId: 1,
            name: 'Luminarias y Reflectores',
            categoryId: 1,
            category: {
              categoryId: 1,
              name: 'Pendiente',
              description: 'Categoría temporal para materiales sin categorizar',
            },
          },
          {
            groupId: 2,
            name: 'Herrajes',
            categoryId: 1,
            category: {
              categoryId: 1,
              name: 'Pendiente',
              description: 'Categoría temporal para materiales sin categorizar',
            },
          },
        ],
        total: 6,
      },
    },
  })
  async getMaterialGroups(@Query('categoryId') categoryId?: string) {
    const where = categoryId ? { categoryId: parseInt(categoryId) } : {};

    const groups = await this.materialGroupRepository.find({
      where,
      relations: ['category'],
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

  // ============================================
  // CRUD GRUPOS DE MATERIALES
  // ============================================

  @Post('material-groups')
  @ApiOperation({
    summary: 'Crear un nuevo grupo de materiales',
    description: 'Crea un nuevo grupo de materiales en la base de datos',
  })
  @ApiResponse({
    status: 201,
    description: 'Grupo creado exitosamente',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un grupo con ese nombre',
  })
  async createMaterialGroup(@Body() createDto: CreateMaterialGroupDto) {
    // Verificar coincidencia exacta (case insensitive)
    const exactMatch = await this.materialGroupRepository.findOne({
      where: { name: ILike(createDto.name) },
    });

    if (exactMatch) {
      throw new ConflictException(
        `Ya existe un grupo con el nombre "${exactMatch.name}"`,
      );
    }

    // Buscar grupos similares usando fuzzy matching
    const similarGroups = await this.dataSource.query(
      `SELECT group_id, name, similarity(LOWER(name), LOWER($1)) as sim
       FROM material_groups
       WHERE similarity(LOWER(name), LOWER($1)) > $2
       ORDER BY sim DESC
       LIMIT 5`,
      [createDto.name, this.SIMILARITY_THRESHOLD],
    );

    if (similarGroups.length > 0) {
      const suggestions = similarGroups.map(
        (g: { name: string; sim: number }) =>
          `"${g.name}" (${Math.round(g.sim * 100)}% similar)`,
      );
      throw new ConflictException({
        message: `Se encontraron grupos similares. ¿Quisiste decir alguno de estos?`,
        suggestions: similarGroups.map((g: { group_id: number; name: string }) => ({
          groupId: g.group_id,
          name: g.name,
        })),
        hint: suggestions.join(', '),
      });
    }

    const group = this.materialGroupRepository.create({
      name: createDto.name.toUpperCase(), // Normalizar a mayúsculas
      categoryId: createDto.categoryId || 1,
    });

    const saved = await this.materialGroupRepository.save(group);

    return {
      message: 'Grupo creado exitosamente',
      data: saved,
    };
  }

  @Patch('material-groups/:id')
  @ApiOperation({
    summary: 'Actualizar un grupo de materiales',
    description: 'Actualiza el nombre o categoría de un grupo existente',
  })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Grupo actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Grupo no encontrado',
  })
  async updateMaterialGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: CreateMaterialGroupDto,
  ) {
    const group = await this.materialGroupRepository.findOne({
      where: { groupId: id },
    });

    if (!group) {
      throw new NotFoundException(`Grupo con ID ${id} no encontrado`);
    }

    // Verificar nombre duplicado si se está cambiando
    if (updateDto.name && updateDto.name !== group.name) {
      const existing = await this.materialGroupRepository.findOne({
        where: { name: updateDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un grupo con el nombre "${updateDto.name}"`,
        );
      }
    }

    Object.assign(group, updateDto);
    const saved = await this.materialGroupRepository.save(group);

    return {
      message: 'Grupo actualizado exitosamente',
      data: saved,
    };
  }

  @Delete('material-groups/:id')
  @ApiOperation({
    summary: 'Eliminar un grupo de materiales',
    description:
      'Elimina un grupo. Falla si tiene materiales asociados.',
  })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Grupo eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Grupo no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar, tiene materiales asociados',
  })
  async deleteMaterialGroup(@Param('id', ParseIntPipe) id: number) {
    const group = await this.materialGroupRepository.findOne({
      where: { groupId: id },
      relations: ['materials'],
    });

    if (!group) {
      throw new NotFoundException(`Grupo con ID ${id} no encontrado`);
    }

    if (group.materials && group.materials.length > 0) {
      throw new ConflictException(
        `No se puede eliminar el grupo "${group.name}" porque tiene ${group.materials.length} materiales asociados`,
      );
    }

    await this.materialGroupRepository.remove(group);

    return {
      message: `Grupo "${group.name}" eliminado exitosamente`,
    };
  }

  // ============================================
  // CRUD MATERIALES
  // ============================================

  @Post('materials')
  @ApiOperation({
    summary: 'Crear un nuevo material',
    description: 'Crea un nuevo material en la base de datos. El grupo es obligatorio.',
  })
  @ApiResponse({
    status: 201,
    description: 'Material creado exitosamente',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un material con ese código',
  })
  @ApiResponse({
    status: 404,
    description: 'Grupo no encontrado',
  })
  async createMaterial(@Body() createDto: CreateMaterialDto) {
    // Verificar que el grupo existe
    const group = await this.materialGroupRepository.findOne({
      where: { groupId: createDto.groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Grupo con ID ${createDto.groupId} no encontrado`,
      );
    }

    // Generar código automáticamente si no se proporciona
    let materialCode = createDto.code;
    if (!materialCode) {
      // Obtener el código máximo actual (asumiendo códigos numéricos)
      const maxCodeResult = await this.dataSource.query(`
        SELECT MAX(CAST(code AS INTEGER)) as max_code
        FROM materials
        WHERE code ~ '^[0-9]+$'
      `);
      const maxCode = maxCodeResult[0]?.max_code || 0;
      materialCode = String(maxCode + 1);
    }

    // Verificar código exacto (case insensitive)
    const existingCode = await this.materialRepository.findOne({
      where: { code: ILike(materialCode) },
    });

    if (existingCode) {
      throw new ConflictException(
        `Ya existe un material con el código "${existingCode.code}"`,
      );
    }

    // Buscar materiales con descripción similar (solo si no se fuerza la creación)
    if (!createDto.force) {
      const similarMaterials = await this.dataSource.query(
        `SELECT m.material_id, m.code, m.description, g.name as group_name,
                similarity(LOWER(m.description), LOWER($1)) as sim
         FROM materials m
         JOIN material_groups g ON m.group_id = g.group_id
         WHERE similarity(LOWER(m.description), LOWER($1)) > $2
         ORDER BY sim DESC
         LIMIT 5`,
        [createDto.description, this.SIMILARITY_THRESHOLD],
      );

      if (similarMaterials.length > 0) {
        const suggestions = similarMaterials.map(
          (m: { code: string; description: string; sim: number }) =>
            `"${m.code} - ${m.description}" (${Math.round(m.sim * 100)}% similar)`,
        );
        throw new ConflictException({
          message: `Se encontraron materiales similares. ¿Quisiste decir alguno de estos?`,
          suggestions: similarMaterials.map(
            (m: { material_id: number; code: string; description: string; group_name: string }) => ({
              materialId: m.material_id,
              code: m.code,
              description: m.description,
              group: m.group_name,
            }),
          ),
          hint: suggestions.join(', '),
        });
      }
    }

    const material = this.materialRepository.create({
      code: materialCode.toUpperCase(),
      description: createDto.description.toUpperCase(),
      groupId: createDto.groupId,
    });

    const saved = await this.materialRepository.save(material);

    const result = await this.materialRepository.findOne({
      where: { materialId: saved.materialId },
      relations: ['materialGroup'],
    });

    return {
      message: 'Material creado exitosamente',
      data: result,
    };
  }

  @Patch('materials/:id')
  @ApiOperation({
    summary: 'Actualizar un material',
    description: 'Actualiza los datos de un material existente',
  })
  @ApiParam({ name: 'id', description: 'ID del material' })
  @ApiResponse({
    status: 200,
    description: 'Material actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Material o grupo no encontrado',
  })
  async updateMaterial(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaterialDto,
  ) {
    const material = await this.materialRepository.findOne({
      where: { materialId: id },
    });

    if (!material) {
      throw new NotFoundException(`Material con ID ${id} no encontrado`);
    }

    // Verificar código duplicado si se está cambiando
    if (updateDto.code && updateDto.code !== material.code) {
      const existing = await this.materialRepository.findOne({
        where: { code: updateDto.code },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un material con el código "${updateDto.code}"`,
        );
      }
    }

    // Verificar que el nuevo grupo existe si se está cambiando
    if (updateDto.groupId) {
      const group = await this.materialGroupRepository.findOne({
        where: { groupId: updateDto.groupId },
      });
      if (!group) {
        throw new NotFoundException(
          `Grupo con ID ${updateDto.groupId} no encontrado`,
        );
      }
    }

    Object.assign(material, updateDto);
    await this.materialRepository.save(material);

    // Retornar con la relación del grupo
    const result = await this.materialRepository.findOne({
      where: { materialId: id },
      relations: ['materialGroup'],
    });

    return {
      message: 'Material actualizado exitosamente',
      data: result,
    };
  }

  @Delete('materials/:id')
  @ApiOperation({
    summary: 'Eliminar un material',
    description: 'Elimina un material de la base de datos',
  })
  @ApiParam({ name: 'id', description: 'ID del material' })
  @ApiResponse({
    status: 200,
    description: 'Material eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Material no encontrado',
  })
  async deleteMaterial(@Param('id', ParseIntPipe) id: number) {
    const material = await this.materialRepository.findOne({
      where: { materialId: id },
    });

    if (!material) {
      throw new NotFoundException(`Material con ID ${id} no encontrado`);
    }

    await this.materialRepository.remove(material);

    return {
      message: `Material "${material.code} - ${material.description}" eliminado exitosamente`,
    };
  }

  // ============================================
  // BÚSQUEDA CON SUGERENCIAS (Fuzzy Search)
  // ============================================

  @Get('material-groups/search')
  @ApiOperation({
    summary: 'Buscar grupos de materiales con fuzzy matching',
    description: `
    Busca grupos por nombre usando similitud de texto.
    Útil para autocompletado y detección de typos.

    Ejemplo: buscar "HERRJE" encontrará "HERRAJES"
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de grupos similares',
  })
  async searchMaterialGroups(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return { data: [], total: 0 };
    }

    const results = await this.dataSource.query(
      `SELECT group_id, name, category_id,
              similarity(LOWER(name), LOWER($1)) as similarity_score
       FROM material_groups
       WHERE similarity(LOWER(name), LOWER($1)) > 0.1
          OR LOWER(name) LIKE LOWER($2)
       ORDER BY similarity_score DESC, name ASC
       LIMIT 10`,
      [query, `%${query}%`],
    );

    return {
      data: results.map((r: { group_id: number; name: string; category_id: number; similarity_score: number }) => ({
        groupId: r.group_id,
        name: r.name,
        categoryId: r.category_id,
        similarity: Math.round(r.similarity_score * 100),
      })),
      total: results.length,
    };
  }

  @Get('materials/search')
  @ApiOperation({
    summary: 'Buscar materiales con fuzzy matching',
    description: `
    Busca materiales por código o descripción usando similitud de texto.
    Útil para autocompletado y detección de typos.

    Ejemplo: buscar "LUMINRIA" encontrará "LUMINARIA LED DE 28W"
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de materiales similares',
  })
  async searchMaterials(
    @Query('q') query: string,
    @Query('groupId') groupId?: string,
  ) {
    if (!query || query.length < 2) {
      return { data: [], total: 0 };
    }

    let sql = `
      SELECT m.material_id, m.code, m.description, m.group_id,
             g.name as group_name,
             GREATEST(
               similarity(LOWER(m.code), LOWER($1)),
               similarity(LOWER(m.description), LOWER($1))
             ) as similarity_score
      FROM materials m
      JOIN material_groups g ON m.group_id = g.group_id
      WHERE (
        similarity(LOWER(m.code), LOWER($1)) > 0.1
        OR similarity(LOWER(m.description), LOWER($1)) > 0.1
        OR LOWER(m.code) LIKE LOWER($2)
        OR LOWER(m.description) LIKE LOWER($2)
      )
    `;

    const params: (string | number)[] = [query, `%${query}%`];

    if (groupId) {
      sql += ` AND m.group_id = $3`;
      params.push(parseInt(groupId));
    }

    sql += ` ORDER BY similarity_score DESC, m.code ASC LIMIT 20`;

    const results = await this.dataSource.query(sql, params);

    return {
      data: results.map(
        (r: {
          material_id: number;
          code: string;
          description: string;
          group_id: number;
          group_name: string;
          similarity_score: number;
        }) => ({
          materialId: r.material_id,
          code: r.code,
          description: r.description,
          groupId: r.group_id,
          groupName: r.group_name,
          similarity: Math.round(r.similarity_score * 100),
        }),
      ),
      total: results.length,
    };
  }
}
