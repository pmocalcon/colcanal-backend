import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Gestion } from '../entities/gestion.entity';
import { RoleGestion } from '../entities/role-gestion.entity';
import { User } from '../entities/user.entity';
import { Company } from '../entities/company.entity';
import { Project } from '../entities/project.entity';
import { OperationCenter } from '../entities/operation-center.entity';
import { ProjectCode } from '../entities/project-code.entity';
import { RequisitionPrefix } from '../entities/requisition-prefix.entity';
import { RequisitionSequence } from '../entities/requisition-sequence.entity';
import { RequisitionStatus } from '../entities/requisition-status.entity';
import { PurchaseOrderStatus } from '../entities/purchase-order-status.entity';
import { MaterialGroup } from '../entities/material-group.entity';
import { Material } from '../entities/material.entity';
import { Authorization } from '../entities/authorization.entity';
import { Supplier } from '../entities/supplier.entity';
import { RequisitionItemQuotation } from '../entities/requisition-item-quotation.entity';

config();

async function seed() {
  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    const roleRepository = dataSource.getRepository(Role);
    const permissionRepository = dataSource.getRepository(Permission);
    const rolePermissionRepository = dataSource.getRepository(RolePermission);
    const gestionRepository = dataSource.getRepository(Gestion);
    const roleGestionRepository = dataSource.getRepository(RoleGestion);
    const userRepository = dataSource.getRepository(User);
    const companyRepository = dataSource.getRepository(Company);
    const projectRepository = dataSource.getRepository(Project);
    const operationCenterRepository = dataSource.getRepository(OperationCenter);
    const projectCodeRepository = dataSource.getRepository(ProjectCode);
    const requisitionPrefixRepository =
      dataSource.getRepository(RequisitionPrefix);
    const requisitionSequenceRepository =
      dataSource.getRepository(RequisitionSequence);
    const requisitionStatusRepository =
      dataSource.getRepository(RequisitionStatus);
    const purchaseOrderStatusRepository =
      dataSource.getRepository(PurchaseOrderStatus);
    const materialGroupRepository = dataSource.getRepository(MaterialGroup);
    const materialRepository = dataSource.getRepository(Material);
    const authorizationRepository = dataSource.getRepository(Authorization);

    // Clear existing data (in reverse order of dependencies)
    console.log('Clearing existing data...');
    await dataSource.query(
      'TRUNCATE TABLE "autorizaciones" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "requisition_approvals" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "requisition_logs" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "requisition_items" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "requisitions" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "suppliers" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "materials" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "material_groups" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "requisition_sequences" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "requisition_prefixes" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "project_codes" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "operation_centers" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "projects" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "companies" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "roles_permisos" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "roles_gestiones" RESTART IDENTITY CASCADE',
    );
    await dataSource.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
    await dataSource.query(
      'TRUNCATE TABLE "permisos" RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE "gestiones" RESTART IDENTITY CASCADE',
    );
    await dataSource.query('TRUNCATE TABLE "roles" RESTART IDENTITY CASCADE');
    await dataSource.query(
      'TRUNCATE TABLE "requisition_statuses" RESTART IDENTITY CASCADE',
    );

    // ============================================
    // 1. SEED ROLES - Según organigrama completo
    // ============================================
    console.log('Seeding roles...');
    const rolesData = [
      {
        nombreRol: 'Gerencia',
        descripcion: 'Aprueba requisiciones revisadas por el nivel anterior',
        category: 'GERENCIA',
      },
      {
        nombreRol: 'Director PMO',
        descripcion: 'Dirige área de PMO y revisa requisiciones de analistas',
        category: 'DIRECTOR_AREA',
      },
      {
        nombreRol: 'Director Comercial',
        descripcion:
          'Dirige área comercial y revisa requisiciones de analistas',
        category: 'DIRECTOR_AREA',
      },
      {
        nombreRol: 'Director Jurídico',
        descripcion: 'Dirige área jurídica y revisa requisiciones de analistas',
        category: 'DIRECTOR_AREA',
      },
      {
        nombreRol: 'Director Técnico',
        descripcion:
          'Revisa requisiciones de Dirección Operativa y crea las propias',
        category: 'DIRECTOR_AREA',
      },
      {
        nombreRol: 'Director Financiero y Administrativo',
        descripcion:
          'Dirige área financiera y administrativa, revisa requisiciones',
        category: 'DIRECTOR_AREA',
      },
      {
        nombreRol: 'Director de Proyecto Antioquia',
        descripcion: 'Supervisa PQRS de Antioquia y crea requisiciones propias',
        category: 'DIRECTOR_PROYECTO',
      },
      {
        nombreRol: 'Director de Proyecto Quindío',
        descripcion: 'Supervisa PQRS de Quindío y crea requisiciones propias',
        category: 'DIRECTOR_PROYECTO',
      },
      {
        nombreRol: 'Director de Proyecto Valle',
        descripcion: 'Supervisa PQRS de Valle y crea requisiciones propias',
        category: 'DIRECTOR_PROYECTO',
      },
      {
        nombreRol: 'Director de Proyecto Putumayo',
        descripcion: 'Supervisa PQRS de Putumayo y crea requisiciones propias',
        category: 'DIRECTOR_PROYECTO',
      },
      {
        nombreRol: 'Analista PMO',
        descripcion: 'Crea requisiciones, reporta a Director PMO',
        category: 'ANALISTA',
      },
      {
        nombreRol: 'Analista Comercial',
        descripcion: 'Crea requisiciones, reporta a Director Comercial',
        category: 'ANALISTA',
      },
      {
        nombreRol: 'Analista Jurídico',
        descripcion: 'Crea requisiciones, reporta a Director Jurídico',
        category: 'ANALISTA',
      },
      {
        nombreRol: 'Analista Administrativo',
        descripcion:
          'Crea requisiciones, reporta a Director Financiero y Administrativo',
        category: 'ANALISTA',
      },
      {
        nombreRol: 'Coordinador Financiero',
        descripcion:
          'Crea requisiciones, reporta a Director Financiero y Administrativo',
        category: 'COORDINADOR',
      },
      {
        nombreRol: 'Coordinador Jurídico',
        descripcion: 'Crea requisiciones, reporta a Director Jurídico',
        category: 'COORDINADOR',
      },
      {
        nombreRol: 'PQRS El Cerrito',
        descripcion: 'Crea requisiciones locales de El Cerrito',
        category: 'PQRS',
      },
      {
        nombreRol: 'PQRS Guacarí',
        descripcion: 'Crea requisiciones locales de Guacarí',
        category: 'PQRS',
      },
      {
        nombreRol: 'PQRS Circasia',
        descripcion: 'Crea requisiciones locales de Circasia',
        category: 'PQRS',
      },
      {
        nombreRol: 'PQRS Quimbaya',
        descripcion: 'Crea requisiciones locales de Quimbaya',
        category: 'PQRS',
      },
      {
        nombreRol: 'PQRS Jericó',
        descripcion: 'Crea requisiciones locales de Jericó',
        category: 'PQRS',
      },
      {
        nombreRol: 'PQRS Ciudad Bolívar',
        descripcion: 'Crea requisiciones locales de Ciudad Bolívar',
        category: 'PQRS',
      },
      {
        nombreRol: 'PQRS Tarso',
        descripcion: 'Crea requisiciones locales de Tarso',
        category: 'PQRS',
      },
      {
        nombreRol: 'PQRS Pueblo Rico',
        descripcion: 'Crea requisiciones locales de Pueblo Rico',
        category: 'PQRS',
      },
      {
        nombreRol: 'PQRS Santa Bárbara',
        descripcion: 'Crea requisiciones locales de Santa Bárbara',
        category: 'PQRS',
      },
      {
        nombreRol: 'PQRS Puerto Asís',
        descripcion: 'Crea requisiciones locales de Puerto Asís',
        category: 'PQRS',
      },
      {
        nombreRol: 'Compras',
        descripcion:
          'Cotiza y gestiona órdenes de compra, no crea requisiciones',
        category: 'COMPRAS',
      },
    ];

    const roles = await roleRepository.save(rolesData);
    console.log(`✅ Created ${roles.length} roles`);

    // ============================================
    // 2. SEED PERMISSIONS
    // ============================================
    console.log('Seeding permissions...');
    const permissionsData = [
      { nombrePermiso: 'Ver', descripcion: 'Permiso para ver recursos' },
      { nombrePermiso: 'Crear', descripcion: 'Permiso para crear recursos' },
      {
        nombrePermiso: 'Revisar',
        descripcion: 'Permiso para revisar/editar recursos',
      },
      {
        nombrePermiso: 'Aprobar',
        descripcion: 'Permiso para aprobar requisiciones',
      },
      { nombrePermiso: 'Cotizar', descripcion: 'Permiso para cotizar' },
      { nombrePermiso: 'Exportar', descripcion: 'Permiso para exportar datos' },
    ];

    const permissions = await permissionRepository.save(permissionsData);
    console.log(`✅ Created ${permissions.length} permissions`);

    // ============================================
    // 3. SEED GESTIONES (Modules)
    // ============================================
    console.log('Seeding gestiones...');
    const gestionesData = [
      { nombre: 'Dashboard', slug: 'dashboard', icono: 'LayoutDashboard' },
      { nombre: 'Compras', slug: 'compras', icono: 'ShoppingCart' },
      { nombre: 'Inventarios', slug: 'inventarios', icono: 'Package' },
      { nombre: 'Reportes', slug: 'reportes', icono: 'BarChart3' },
      { nombre: 'Usuarios', slug: 'usuarios', icono: 'Users' },
      { nombre: 'Proveedores', slug: 'proveedores', icono: 'Building2' },
      { nombre: 'Auditorías', slug: 'auditorias', icono: 'FileText' },
      {
        nombre: 'Notificaciones',
        slug: 'notificaciones',
        icono: 'Bell',
      },
    ];

    const gestiones = await gestionRepository.save(gestionesData);
    console.log(`✅ Created ${gestiones.length} gestiones`);

    // ============================================
    // 4. ASSIGN GESTIONES TO ROLES (todos tienen acceso a Compras)
    // ============================================
    console.log('Assigning gestiones to roles...');
    const comprasGestion = gestiones.find((g) => g.slug === 'compras');
    if (comprasGestion) {
      const allRoleGestiones = roles.map((role) => ({
        rolId: role.rolId,
        gestionId: comprasGestion.gestionId,
      }));
      await roleGestionRepository.save(allRoleGestiones);
      console.log(`✅ Assigned Compras gestion to all ${roles.length} roles`);
    }

    // Asignar Auditorías solo a Gerencia, Director PMO y Analista PMO
    const auditoriasGestion = gestiones.find((g) => g.slug === 'auditorias');
    if (auditoriasGestion) {
      const gerenciaRole = roles.find((r) => r.nombreRol === 'Gerencia');
      const directorPMORole = roles.find((r) => r.nombreRol === 'Director PMO');
      const analistaPMORole = roles.find((r) => r.nombreRol === 'Analista PMO');

      const auditoriasRoleGestiones: Array<{ rolId: number; gestionId: number }> = [];
      if (gerenciaRole) {
        auditoriasRoleGestiones.push({
          rolId: gerenciaRole.rolId,
          gestionId: auditoriasGestion.gestionId,
        });
      }
      if (directorPMORole) {
        auditoriasRoleGestiones.push({
          rolId: directorPMORole.rolId,
          gestionId: auditoriasGestion.gestionId,
        });
      }
      if (analistaPMORole) {
        auditoriasRoleGestiones.push({
          rolId: analistaPMORole.rolId,
          gestionId: auditoriasGestion.gestionId,
        });
      }

      if (auditoriasRoleGestiones.length > 0) {
        await roleGestionRepository.save(auditoriasRoleGestiones);
        console.log(
          `✅ Assigned Auditorías gestion to ${auditoriasRoleGestiones.length} roles (Gerencia, Director PMO, Analista PMO)`,
        );
      }
    }

    // ============================================
    // 5. SEED COMPANIES
    // ============================================
    console.log('Seeding companies...');
    const companiesData = [
      { name: 'Canales & Contactos' },
      { name: 'Unión Temporal Alumbrado Público El Cerrito' },
      { name: 'Unión Temporal Alumbrado Público Circasia' },
      { name: 'Unión Temporal Alumbrado Público Guacarí' },
      { name: 'Unión Temporal Alumbrado Público Jamundí' },
      { name: 'Unión Temporal Alumbrado Público Puerto Asís' },
      { name: 'Unión Temporal Alumbrado Público Quimbaya' },
      { name: 'Unión Temporal Alumbrado Público Santa Bárbara' },
    ];

    const companies = await companyRepository.save(companiesData);
    console.log(`✅ Created ${companies.length} companies`);

    // ============================================
    // 6. SEED PROJECTS (solo para Canales & Contactos)
    // ============================================
    console.log('Seeding projects...');
    const canalesCompany = companies.find((c) =>
      c.name.includes('Canales & Contactos'),
    )!;
    const projectsData = [
      { companyId: canalesCompany.companyId, name: 'Administrativo' },
      { companyId: canalesCompany.companyId, name: 'Ciudad Bolívar' },
      { companyId: canalesCompany.companyId, name: 'Jericó' },
      { companyId: canalesCompany.companyId, name: 'Pueblo Rico' },
      { companyId: canalesCompany.companyId, name: 'Tarso' },
    ];

    const projects = await projectRepository.save(projectsData);
    console.log(`✅ Created ${projects.length} projects`);

    // ============================================
    // 7. SEED OPERATION CENTERS
    // ============================================
    console.log('Seeding operation centers...');
    const operationCentersData = [
      // Canales & Contactos projects
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Administrativo')!.projectId,
        code: '008',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Ciudad Bolívar')!.projectId,
        code: '961',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Jericó')!.projectId,
        code: '960',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Pueblo Rico')!.projectId,
        code: '962',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Tarso')!.projectId,
        code: '963',
      },
      // Uniones Temporales (sin projectId)
      {
        companyId: companies.find((c) => c.name.includes('El Cerrito'))!
          .companyId,
        projectId: undefined,
        code: '002',
      },
      {
        companyId: companies.find((c) => c.name.includes('Circasia'))!
          .companyId,
        projectId: undefined,
        code: '001',
      },
      {
        companyId: companies.find((c) => c.name.includes('Guacarí'))!.companyId,
        projectId: undefined,
        code: '003',
      },
      {
        companyId: companies.find((c) => c.name.includes('Jamundí'))!.companyId,
        projectId: undefined,
        code: '004',
      },
      {
        companyId: companies.find((c) => c.name.includes('Puerto Asís'))!
          .companyId,
        projectId: undefined,
        code: '005',
      },
      {
        companyId: companies.find((c) => c.name.includes('Quimbaya'))!
          .companyId,
        projectId: undefined,
        code: '006',
      },
      {
        companyId: companies.find((c) => c.name.includes('Santa Bárbara'))!
          .companyId,
        projectId: undefined,
        code: '007',
      },
    ];

    const operationCenters =
      await operationCenterRepository.save(operationCentersData);
    console.log(`✅ Created ${operationCenters.length} operation centers`);

    // ============================================
    // 8. SEED PROJECT CODES
    // ============================================
    console.log('Seeding project codes...');
    const projectCodesData = [
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Ciudad Bolívar')!.projectId,
        code: '08. C&C - Ciudad Bolívar - 2022',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Jericó')!.projectId,
        code: '07. C&C - Jericó - 2021',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Pueblo Rico')!.projectId,
        code: '09. C&C - Pueblorico - 2022',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Tarso')!.projectId,
        code: '10. C&C - Tarso - 2022',
      },
      {
        companyId: companies.find((c) => c.name.includes('El Cerrito'))!
          .companyId,
        projectId: undefined,
        code: '03. UT - El Cerrito - 2015',
      },
      {
        companyId: companies.find((c) => c.name.includes('Circasia'))!
          .companyId,
        projectId: undefined,
        code: '05. UT - Circasia - 2015',
      },
      {
        companyId: companies.find((c) => c.name.includes('Guacarí'))!.companyId,
        projectId: undefined,
        code: '01. UT - Guacarí - 2014',
      },
      {
        companyId: companies.find((c) => c.name.includes('Jamundí'))!.companyId,
        projectId: undefined,
        code: '02. UT - Jamundi - 2014',
      },
      {
        companyId: companies.find((c) => c.name.includes('Puerto Asís'))!
          .companyId,
        projectId: undefined,
        code: '06. UT - Puerto Asís - 2015',
      },
      {
        companyId: companies.find((c) => c.name.includes('Quimbaya'))!
          .companyId,
        projectId: undefined,
        code: '04. UT - Quimbaya - 2015',
      },
      {
        companyId: companies.find((c) => c.name.includes('Santa Bárbara'))!
          .companyId,
        projectId: undefined,
        code: '11. UT - Santa Bárbara - 2022',
      },
    ];

    const projectCodes = await projectCodeRepository.save(projectCodesData);
    console.log(`✅ Created ${projectCodes.length} project codes`);

    // ============================================
    // 9. SEED REQUISITION PREFIXES
    // ============================================
    console.log('Seeding requisition prefixes...');
    const requisitionPrefixesData = [
      {
        companyId: canalesCompany.companyId,
        projectId: undefined,
        prefix: 'C&C',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Administrativo')!.projectId,
        prefix: 'C&C',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Ciudad Bolívar')!.projectId,
        prefix: 'CB',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Jericó')!.projectId,
        prefix: 'JE',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Pueblo Rico')!.projectId,
        prefix: 'PR',
      },
      {
        companyId: canalesCompany.companyId,
        projectId: projects.find((p) => p.name === 'Tarso')!.projectId,
        prefix: 'TA',
      },
      {
        companyId: companies.find((c) => c.name.includes('El Cerrito'))!
          .companyId,
        projectId: undefined,
        prefix: 'CE',
      },
      {
        companyId: companies.find((c) => c.name.includes('Circasia'))!
          .companyId,
        projectId: undefined,
        prefix: 'CI',
      },
      {
        companyId: companies.find((c) => c.name.includes('Guacarí'))!.companyId,
        projectId: undefined,
        prefix: 'GU',
      },
      {
        companyId: companies.find((c) => c.name.includes('Jamundí'))!.companyId,
        projectId: undefined,
        prefix: 'JA',
      },
      {
        companyId: companies.find((c) => c.name.includes('Puerto Asís'))!
          .companyId,
        projectId: undefined,
        prefix: 'PA',
      },
      {
        companyId: companies.find((c) => c.name.includes('Quimbaya'))!
          .companyId,
        projectId: undefined,
        prefix: 'QY',
      },
      {
        companyId: companies.find((c) => c.name.includes('Santa Bárbara'))!
          .companyId,
        projectId: undefined,
        prefix: 'SB',
      },
    ];

    const requisitionPrefixes = await requisitionPrefixRepository.save(
      requisitionPrefixesData,
    );
    console.log(
      `✅ Created ${requisitionPrefixes.length} requisition prefixes`,
    );

    // ============================================
    // 10. SEED REQUISITION SEQUENCES (iniciar en 0)
    // ============================================
    console.log('Seeding requisition sequences...');
    const requisitionSequencesData = requisitionPrefixes.map((prefix) => ({
      prefixId: prefix.prefixId,
      lastNumber: 0,
    }));

    const requisitionSequences = await requisitionSequenceRepository.save(
      requisitionSequencesData,
    );
    console.log(
      `✅ Created ${requisitionSequences.length} requisition sequences`,
    );

    // ============================================
    // 11. SEED REQUISITION STATUSES
    // ============================================
    console.log('Seeding requisition statuses...');
    const requisitionStatusesData = [
      {
        code: 'pendiente',
        name: 'Pendiente',
        description: 'Requisición recién creada, sin revisar',
        color: 'gray',
        order: 1,
      },
      {
        code: 'en_revision',
        name: 'En revisión',
        description: 'En proceso de revisión por Director de área',
        color: 'blue',
        order: 2,
      },
      {
        code: 'aprobada_revisor',
        name: 'Aprobada por revisor',
        description: 'Lista para revisión de Gerencia',
        color: 'green',
        order: 3,
      },
      {
        code: 'aprobada_gerencia',
        name: 'Aprobada por gerencia',
        description: 'Lista para cotización por Compras',
        color: 'emerald',
        order: 4,
      },
      {
        code: 'en_cotizacion',
        name: 'En cotización',
        description: 'En proceso de cotización por Compras',
        color: 'cyan',
        order: 5,
      },
      {
        code: 'rechazada_revisor',
        name: 'Rechazada por revisor',
        description: 'Devuelta al solicitante',
        color: 'orange',
        order: 6,
      },
      {
        code: 'rechazada_gerencia',
        name: 'Rechazada por gerencia',
        description: 'Devuelta al solicitante por Gerencia',
        color: 'red',
        order: 7,
      },
      {
        code: 'cotizada',
        name: 'Cotizada',
        description: 'Cotizaciones registradas',
        color: 'yellow',
        order: 8,
      },
      {
        code: 'en_orden_compra',
        name: 'En orden de compra',
        description: 'Orden generada y en trámite',
        color: 'indigo',
        order: 9,
      },
      {
        code: 'pendiente_recepcion',
        name: 'Pendiente de recepción',
        description: 'Orden emitida, en espera de materiales',
        color: 'purple',
        order: 10,
      },
      {
        code: 'en_recepcion',
        name: 'En recepción',
        description: 'Recepción parcial de materiales en proceso',
        color: 'violet',
        order: 11,
      },
      {
        code: 'recepcion_completa',
        name: 'Recepción completa',
        description: 'Todos los materiales recibidos',
        color: 'teal',
        order: 12,
      },
    ];

    const requisitionStatuses = await requisitionStatusRepository.save(
      requisitionStatusesData,
    );
    console.log(
      `✅ Created ${requisitionStatuses.length} requisition statuses`,
    );

    // ============================================
    // 12. SEED PURCHASE ORDER STATUSES
    // ============================================
    console.log('Seeding purchase order statuses...');
    const purchaseOrderStatusesData = [
      {
        code: 'borrador',
        name: 'Borrador',
        description: 'Orden de compra en borrador',
        color: 'gray',
        order: 1,
      },
      {
        code: 'pendiente_aprobacion_gerencia',
        name: 'Pendiente de aprobación',
        description: 'En espera de aprobación de gerencia',
        color: 'yellow',
        order: 2,
      },
      {
        code: 'aprobada_gerencia',
        name: 'Aprobada',
        description: 'Aprobada por gerencia',
        color: 'green',
        order: 3,
      },
      {
        code: 'rechazada_gerencia',
        name: 'Rechazada',
        description: 'Rechazada por gerencia',
        color: 'red',
        order: 4,
      },
      {
        code: 'en_recepcion',
        name: 'En recepción',
        description: 'Materiales en proceso de recepción',
        color: 'blue',
        order: 5,
      },
      {
        code: 'completada',
        name: 'Completada',
        description: 'Orden de compra completada',
        color: 'teal',
        order: 6,
      },
    ];

    const purchaseOrderStatuses = await purchaseOrderStatusRepository.save(
      purchaseOrderStatusesData,
    );
    console.log(
      `✅ Created ${purchaseOrderStatuses.length} purchase order statuses`,
    );

    // ============================================
    // 13. SEED MATERIAL GROUPS
    // ============================================
    console.log('Seeding material groups...');
    const materialGroupsData = [
      { name: 'Luminarias y Reflectores' },
      { name: 'Herrajes' },
      { name: 'Conectores' },
      { name: 'Protectores' },
      { name: 'Electrónico' },
      { name: 'Suministros de Oficina' },
    ];
    
    const materialGroups = await materialGroupRepository.save(materialGroupsData);
    console.log(`✅ Created ${materialGroups.length} material groups`);

    // ============================================
    // 14. SEED MATERIALS (catálogo básico)
    // ============================================
    console.log('Seeding materials...');

    // 🔍 Encuentra cada grupo recién creado
    const luminariasGroup = materialGroups.find(
      (g) => g.name === 'Luminarias y Reflectores',
    )!;
    const herrajesGroup = materialGroups.find(
      (g) => g.name === 'Herrajes',
    )!;
    const conectoresGroup = materialGroups.find(
      (g) => g.name === 'Conectores',
    )!;
    const protectoresGroup = materialGroups.find(
      (g) => g.name === 'Protectores',
    )!;
    const electronicoGroup = materialGroups.find(
      (g) => g.name === 'Electrónico',
    )!;
    const oficinaGroup = materialGroups.find(
      (g) => g.name === 'Suministros de Oficina',
    )!;


    console.log('Seeding materials...');

    const materialsData = [
      // =============================
      // LUMINARIAS Y REFLECTORES (3000–3053)
      // =============================
      {
        code: '3047',
        description: 'Proyector LED de 205W',
        groupId: luminariasGroup.groupId,
      },
      {
        code: '3048',
        description: 'Luminaria decorativa LED de 26W',
        groupId: luminariasGroup.groupId,
      },
      {
        code: '3050',
        description: 'Luminaria decorativa LED de 40W',
        groupId: luminariasGroup.groupId,
      },
      {
        code: '3053',
        description: 'Luminaria solar LED de 60W',
        groupId: luminariasGroup.groupId,
      },
    
      // =============================
      // HERRAJES (3200–3260)
      // =============================
      {
        code: '3200',
        description: 'Collarín grillete 3-4" T3/8 U1 1/2',
        groupId: herrajesGroup.groupId,
      },
      {
        code: '3231',
        description: 'Brazo doble galvanizado 0.35m alt. 0.4m D1 1/4"',
        groupId: herrajesGroup.groupId,
      },
      {
        code: '3244',
        description: 'Cruceta metálica galvanizada 1/4" x 3" x 2m',
        groupId: herrajesGroup.groupId,
      },
      {
        code: '3248',
        description: 'Varilla roscada galvanizada 3/8" x 3m',
        groupId: herrajesGroup.groupId,
      },
    
      // =============================
      // CONECTORES (3300–3311)
      // =============================
      {
        code: '3300',
        description: 'Conector 2 polos WAGO',
        groupId: conectoresGroup.groupId,
      },
      {
        code: '3302',
        description: 'Conector 4 polos WAGO',
        groupId: conectoresGroup.groupId,
      },
      {
        code: '3307',
        description: 'Conector prensa estopa de 3/4"',
        groupId: conectoresGroup.groupId,
      },
      {
        code: '3309',
        description: 'Empalme en gel 6-2 AWG 14-8AWG',
        groupId: conectoresGroup.groupId,
      },
    
      // =============================
      // PROTECTORES (3400–3415)
      // =============================
      {
        code: '3400',
        description: 'Breaker 1x60A',
        groupId: protectoresGroup.groupId,
      },
      {
        code: '3402',
        description: 'DPS 10kV',
        groupId: protectoresGroup.groupId,
      },
      {
        code: '3410',
        description: 'Pararrayo 15kV',
        groupId: protectoresGroup.groupId,
      },
      {
        code: '3408',
        description: 'Kit puesta a tierra',
        groupId: protectoresGroup.groupId,
      },
    
      // =============================
      // ELECTRÓNICO (3500–3539)
      // =============================
      {
        code: '3500',
        description: 'Driver de 28W',
        groupId: electronicoGroup.groupId,
      },
      {
        code: '3511',
        description: 'Driver de 50W',
        groupId: electronicoGroup.groupId,
      },
      {
        code: '3534',
        description: 'Driver de 205W',
        groupId: electronicoGroup.groupId,
      },
      {
        code: '3537',
        description: 'Fotocelda IP65',
        groupId: electronicoGroup.groupId,
      },
    
      // =============================
      // SUMINISTROS DE OFICINA
      // =============================
      {
        code: '4000',
        description: 'Resma de papel tamaño carta',
        groupId: oficinaGroup.groupId,
      },
      {
        code: '4001',
        description: 'Carpeta de archivo tipo AZ',
        groupId: oficinaGroup.groupId,
      },
    ];
    
    const materials = await materialRepository.save(materialsData);
    console.log(`✅ Created ${materials.length} materials`);

    // ============================================
    // 14. SEED SUPPLIERS (proveedores de prueba)
    // ============================================
    console.log('Seeding suppliers...');
    const supplierRepository = dataSource.getRepository(Supplier);

    const suppliersData = [
      {
        nitCc: '900123456-1',
        name: 'Distribuidora Eléctrica del Valle S.A.S',
        contactPerson: 'Carlos Rodríguez',
        phone: '3101234567',
        email: 'ventas@distrivalle.com',
        address: 'Calle 10 #15-20',
        city: 'Cali',
        isActive: true,
      },
      {
        nitCc: '800987654-3',
        name: 'Suministros Industriales Colombia Ltda',
        contactPerson: 'María Fernanda López',
        phone: '3209876543',
        email: 'compras@suministroscol.com',
        address: 'Carrera 25 #45-30',
        city: 'Bogotá',
        isActive: true,
      },
      {
        nitCc: '700555888-9',
        name: 'Materiales Eléctricos Express S.A',
        contactPerson: 'Jorge Alberto Díaz',
        phone: '3156789012',
        email: 'contacto@matelectricos.com',
        address: 'Avenida 6N #28-15',
        city: 'Cali',
        isActive: true,
      },
      {
        nitCc: '900333222-5',
        name: 'Ferretería y Construcciones Los Andes S.A.S',
        contactPerson: 'Andrea Morales Vélez',
        phone: '3187654321',
        email: 'ventas@ferreterialosandes.com',
        address: 'Carrera 15 #30-45',
        city: 'Medellín',
        isActive: true,
      },
      {
        nitCc: '800444555-7',
        name: 'Equipos y Herramientas Industriales Ltda',
        contactPerson: 'Roberto Castro Jiménez',
        phone: '3165432109',
        email: 'info@equiposind.com',
        address: 'Calle 50 #20-10',
        city: 'Bogotá',
        isActive: true,
      },
      {
        nitCc: '900777888-2',
        name: 'Comercializadora Eléctrica del Pacífico S.A',
        contactPerson: 'Luisa Fernanda Gómez',
        phone: '3198765432',
        email: 'comercial@electricapacifico.com',
        address: 'Avenida 3 Norte #12-25',
        city: 'Cali',
        isActive: true,
      },
    ];

    const suppliers = await supplierRepository.save(suppliersData);
    console.log(`✅ Created ${suppliers.length} suppliers`);

    // ============================================
    // 15. SEED TEST USERS (27 usuarios - uno por cada rol)
    // ============================================
    console.log('Seeding test users...');
    const hashedPassword = await bcrypt.hash('Canalco2025!', 10);

    // Obtener roles
    const gerenciaRole = roles.find((r) => r.nombreRol === 'Gerencia')!;
    const dirPMORole = roles.find((r) => r.nombreRol === 'Director PMO')!;
    const dirComercialRole = roles.find(
      (r) => r.nombreRol === 'Director Comercial',
    )!;
    const dirJuridicoRole = roles.find(
      (r) => r.nombreRol === 'Director Jurídico',
    )!;
    const dirTecnicoRole = roles.find(
      (r) => r.nombreRol === 'Director Técnico',
    )!;
    const dirFinancieroRole = roles.find(
      (r) => r.nombreRol === 'Director Financiero y Administrativo',
    )!;
    const dirProyAntioquiaRole = roles.find(
      (r) => r.nombreRol === 'Director de Proyecto Antioquia',
    )!;
    const dirProyQuindioRole = roles.find(
      (r) => r.nombreRol === 'Director de Proyecto Quindío',
    )!;
    const dirProyValleRole = roles.find(
      (r) => r.nombreRol === 'Director de Proyecto Valle',
    )!;
    const dirProyPutumayoRole = roles.find(
      (r) => r.nombreRol === 'Director de Proyecto Putumayo',
    )!;
    const analistaPMORole = roles.find((r) => r.nombreRol === 'Analista PMO')!;
    const analistaComercialRole = roles.find(
      (r) => r.nombreRol === 'Analista Comercial',
    )!;
    const analistaJuridicoRole = roles.find(
      (r) => r.nombreRol === 'Analista Jurídico',
    )!;
    const analistaAdminRole = roles.find(
      (r) => r.nombreRol === 'Analista Administrativo',
    )!;
    const coordFinancieroRole = roles.find(
      (r) => r.nombreRol === 'Coordinador Financiero',
    )!;
    const coordJuridicoRole = roles.find(
      (r) => r.nombreRol === 'Coordinador Jurídico',
    )!;
    const pqrsElCerritoRole = roles.find(
      (r) => r.nombreRol === 'PQRS El Cerrito',
    )!;
    const pqrsGuacariRole = roles.find((r) => r.nombreRol === 'PQRS Guacarí')!;
    const pqrsCircasiaRole = roles.find(
      (r) => r.nombreRol === 'PQRS Circasia',
    )!;
    const pqrsQuimbayaRole = roles.find(
      (r) => r.nombreRol === 'PQRS Quimbaya',
    )!;
    const pqrsJericoRole = roles.find((r) => r.nombreRol === 'PQRS Jericó')!;
    const pqrsCiudadBolivarRole = roles.find(
      (r) => r.nombreRol === 'PQRS Ciudad Bolívar',
    )!;
    const pqrsTarsoRole = roles.find((r) => r.nombreRol === 'PQRS Tarso')!;
    const pqrsPuebloRicoRole = roles.find(
      (r) => r.nombreRol === 'PQRS Pueblo Rico',
    )!;
    const pqrsSantaBarbaraRole = roles.find(
      (r) => r.nombreRol === 'PQRS Santa Bárbara',
    )!;
    const pqrsPuertoAsisRole = roles.find(
      (r) => r.nombreRol === 'PQRS Puerto Asís',
    )!;
    const comprasRole = roles.find((r) => r.nombreRol === 'Compras')!;

    const usersData = [
      // Gerencia
      {
        email: 'gerencia@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Laura Pérez',
        cargo: 'Gerente General',
        rolId: gerenciaRole.rolId,
        estado: true,
      },
      // Directores de Área
      {
        email: 'director.pmo@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Roberto Mendoza',
        cargo: 'Director PMO',
        rolId: dirPMORole.rolId,
        estado: true,
      },
      {
        email: 'director.comercial@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Patricia Vargas',
        cargo: 'Directora Comercial',
        rolId: dirComercialRole.rolId,
        estado: true,
      },
      {
        email: 'director.juridico@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Andrés Morales',
        cargo: 'Director Jurídico',
        rolId: dirJuridicoRole.rolId,
        estado: true,
      },
      {
        email: 'director.tecnico@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Carlos Rivas',
        cargo: 'Director Técnico',
        rolId: dirTecnicoRole.rolId,
        estado: true,
      },
      {
        email: 'director.financiero@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Diana Torres',
        cargo: 'Directora Financiera y Administrativa',
        rolId: dirFinancieroRole.rolId,
        estado: true,
      },
      // Directores de Proyecto
      {
        email: 'director.antioquia@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Ana Restrepo',
        cargo: 'Directora de Proyecto Antioquia',
        rolId: dirProyAntioquiaRole.rolId,
        estado: true,
      },
      {
        email: 'director.quindio@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Jorge Cardona',
        cargo: 'Director de Proyecto Quindío',
        rolId: dirProyQuindioRole.rolId,
        estado: true,
      },
      {
        email: 'director.valle@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Claudia Ramírez',
        cargo: 'Directora de Proyecto Valle',
        rolId: dirProyValleRole.rolId,
        estado: true,
      },
      {
        email: 'director.putumayo@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Miguel Ángel Castro',
        cargo: 'Director de Proyecto Putumayo',
        rolId: dirProyPutumayoRole.rolId,
        estado: true,
      },
      // Analistas y Coordinadores
      {
        email: 'analista.pmo@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Sandra Jiménez',
        cargo: 'Analista PMO',
        rolId: analistaPMORole.rolId,
        estado: true,
      },
      {
        email: 'analista.comercial@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Luis Fernando López',
        cargo: 'Analista Comercial',
        rolId: analistaComercialRole.rolId,
        estado: true,
      },
      {
        email: 'analista.juridico@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Carolina Herrera',
        cargo: 'Analista Jurídica',
        rolId: analistaJuridicoRole.rolId,
        estado: true,
      },
      {
        email: 'analista.admin@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Javier Sánchez',
        cargo: 'Analista Administrativo',
        rolId: analistaAdminRole.rolId,
        estado: true,
      },
      {
        email: 'coordinador.financiero@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Marcela Rojas',
        cargo: 'Coordinadora Financiera',
        rolId: coordFinancieroRole.rolId,
        estado: true,
      },
      {
        email: 'coordinador.juridico@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Ricardo Bermúdez',
        cargo: 'Coordinador Jurídico',
        rolId: coordJuridicoRole.rolId,
        estado: true,
      },
      // PQRS (Personal de campo)
      {
        email: 'pqrs.elcerrito@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Sofía Martínez',
        cargo: 'PQRS El Cerrito',
        rolId: pqrsElCerritoRole.rolId,
        estado: true,
      },
      {
        email: 'pqrs.guacari@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Juan Pablo García',
        cargo: 'PQRS Guacarí',
        rolId: pqrsGuacariRole.rolId,
        estado: true,
      },
      {
        email: 'pqrs.circasia@canalcongroup.com',
        password: hashedPassword,
        nombre: 'María Fernanda Álvarez',
        cargo: 'PQRS Circasia',
        rolId: pqrsCircasiaRole.rolId,
        estado: true,
      },
      {
        email: 'pqrs.quimbaya@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Andrés Felipe Ospina',
        cargo: 'PQRS Quimbaya',
        rolId: pqrsQuimbayaRole.rolId,
        estado: true,
      },
      {
        email: 'pqrs.jerico@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Natalia Vélez',
        cargo: 'PQRS Jericó',
        rolId: pqrsJericoRole.rolId,
        estado: true,
      },
      {
        email: 'pqrs.ciudadbolivar@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Daniel Mejía',
        cargo: 'PQRS Ciudad Bolívar',
        rolId: pqrsCiudadBolivarRole.rolId,
        estado: true,
      },
      {
        email: 'pqrs.tarso@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Mario Gómez',
        cargo: 'PQRS Tarso',
        rolId: pqrsTarsoRole.rolId,
        estado: true,
      },
      {
        email: 'pqrs.pueblorico@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Laura Cristina Montoya',
        cargo: 'PQRS Pueblo Rico',
        rolId: pqrsPuebloRicoRole.rolId,
        estado: true,
      },
      {
        email: 'pqrs.santabarbara@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Camilo Andrés Quintero',
        cargo: 'PQRS Santa Bárbara',
        rolId: pqrsSantaBarbaraRole.rolId,
        estado: true,
      },
      {
        email: 'pqrs.puertoasis@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Valentina Garzón',
        cargo: 'PQRS Puerto Asís',
        rolId: pqrsPuertoAsisRole.rolId,
        estado: true,
      },
      // Compras
      {
        email: 'compras@canalcongroup.com',
        password: hashedPassword,
        nombre: 'Paola Silva',
        cargo: 'Coordinadora de Compras',
        rolId: comprasRole.rolId,
        estado: true,
      },
    ];

    const users = await userRepository.save(usersData);
    console.log(`✅ Created ${users.length} test users`);

    // ============================================
    // 15. SEED AUTHORIZATIONS (jerarquía de supervisión completa)
    // ============================================
    console.log('Seeding authorizations...');

    // Obtener usuarios
    const gerenciaUser = users.find((u) => u.email === 'gerencia@canalcongroup.com')!;
    const dirPMOUser = users.find((u) => u.email === 'director.pmo@canalcongroup.com')!;
    const dirComercialUser = users.find(
      (u) => u.email === 'director.comercial@canalcongroup.com',
    )!;
    const dirJuridicoUser = users.find(
      (u) => u.email === 'director.juridico@canalcongroup.com',
    )!;
    const dirTecnicoUser = users.find(
      (u) => u.email === 'director.tecnico@canalcongroup.com',
    )!;
    const dirFinancieroUser = users.find(
      (u) => u.email === 'director.financiero@canalcongroup.com',
    )!;
    const dirProyAntioquiaUser = users.find(
      (u) => u.email === 'director.antioquia@canalcongroup.com',
    )!;
    const dirProyQuindioUser = users.find(
      (u) => u.email === 'director.quindio@canalcongroup.com',
    )!;
    const dirProyValleUser = users.find(
      (u) => u.email === 'director.valle@canalcongroup.com',
    )!;
    const dirProyPutumayoUser = users.find(
      (u) => u.email === 'director.putumayo@canalcongroup.com',
    )!;
    const analistaPMOUser = users.find(
      (u) => u.email === 'analista.pmo@canalcongroup.com',
    )!;
    const analistaComercialUser = users.find(
      (u) => u.email === 'analista.comercial@canalcongroup.com',
    )!;
    const analistaJuridicoUser = users.find(
      (u) => u.email === 'analista.juridico@canalcongroup.com',
    )!;
    const analistaAdminUser = users.find(
      (u) => u.email === 'analista.admin@canalcongroup.com',
    )!;
    const coordFinancieroUser = users.find(
      (u) => u.email === 'coordinador.financiero@canalcongroup.com',
    )!;
    const coordJuridicoUser = users.find(
      (u) => u.email === 'coordinador.juridico@canalcongroup.com',
    )!;

    // PQRS de cada región
    const pqrsElCerritoUser = users.find(
      (u) => u.email === 'pqrs.elcerrito@canalcongroup.com',
    )!;
    const pqrsGuacariUser = users.find(
      (u) => u.email === 'pqrs.guacari@canalcongroup.com',
    )!;
    const pqrsCircasiaUser = users.find(
      (u) => u.email === 'pqrs.circasia@canalcongroup.com',
    )!;
    const pqrsQuimbayaUser = users.find(
      (u) => u.email === 'pqrs.quimbaya@canalcongroup.com',
    )!;
    const pqrsJericoUser = users.find(
      (u) => u.email === 'pqrs.jerico@canalcongroup.com',
    )!;
    const pqrsCiudadBolivarUser = users.find(
      (u) => u.email === 'pqrs.ciudadbolivar@canalcongroup.com',
    )!;
    const pqrsTarsoUser = users.find(
      (u) => u.email === 'pqrs.tarso@canalcongroup.com',
    )!;
    const pqrsPuebloRicoUser = users.find(
      (u) => u.email === 'pqrs.pueblorico@canalcongroup.com',
    )!;
    const pqrsSantaBarbaraUser = users.find(
      (u) => u.email === 'pqrs.santabarbara@canalcongroup.com',
    )!;
    const pqrsPuertoAsisUser = users.find(
      (u) => u.email === 'pqrs.puertoasis@canalcongroup.com',
    )!;

    const authorizationsData = [
      // ============================================
      // FLUJO 1: PQRS → Director Proyecto → Gerencia (2 niveles)
      // ============================================

      // PQRS ANTIOQUIA (Jericó, Ciudad Bolívar, Tarso, Pueblo Rico, Santa Bárbara)
      {
        usuarioAutorizadorId: dirProyAntioquiaUser.userId,
        usuarioAutorizadoId: pqrsJericoUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: dirProyAntioquiaUser.userId,
        usuarioAutorizadoId: pqrsCiudadBolivarUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: dirProyAntioquiaUser.userId,
        usuarioAutorizadoId: pqrsTarsoUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: dirProyAntioquiaUser.userId,
        usuarioAutorizadoId: pqrsPuebloRicoUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: dirProyAntioquiaUser.userId,
        usuarioAutorizadoId: pqrsSantaBarbaraUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // PQRS QUINDÍO (Circasia, Quimbaya)
      {
        usuarioAutorizadorId: dirProyQuindioUser.userId,
        usuarioAutorizadoId: pqrsCircasiaUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: dirProyQuindioUser.userId,
        usuarioAutorizadoId: pqrsQuimbayaUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // PQRS VALLE (El Cerrito, Guacarí)
      {
        usuarioAutorizadorId: dirProyValleUser.userId,
        usuarioAutorizadoId: pqrsElCerritoUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: dirProyValleUser.userId,
        usuarioAutorizadoId: pqrsGuacariUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // PQRS PUTUMAYO (Puerto Asís)
      {
        usuarioAutorizadorId: dirProyPutumayoUser.userId,
        usuarioAutorizadoId: pqrsPuertoAsisUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // Directores de Proyecto → Gerencia (aprobación nivel 2 para PQRS)
      {
        usuarioAutorizadorId: gerenciaUser.userId,
        usuarioAutorizadoId: dirProyAntioquiaUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'aprobacion',
        nivel: 2,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: gerenciaUser.userId,
        usuarioAutorizadoId: dirProyQuindioUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'aprobacion',
        nivel: 2,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: gerenciaUser.userId,
        usuarioAutorizadoId: dirProyValleUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'aprobacion',
        nivel: 2,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: gerenciaUser.userId,
        usuarioAutorizadoId: dirProyPutumayoUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'aprobacion',
        nivel: 2,
        esActivo: true,
      },

      // ============================================
      // FLUJO 2: Directores de Proyecto → Director Técnico → Gerencia
      // ============================================

      // Directores de Proyecto → Director Técnico (revisión nivel 1)
      {
        usuarioAutorizadorId: dirTecnicoUser.userId,
        usuarioAutorizadoId: dirProyAntioquiaUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: dirTecnicoUser.userId,
        usuarioAutorizadoId: dirProyQuindioUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: dirTecnicoUser.userId,
        usuarioAutorizadoId: dirProyValleUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: dirTecnicoUser.userId,
        usuarioAutorizadoId: dirProyPutumayoUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // Director Técnico → Gerencia (aprobación nivel 2)
      {
        usuarioAutorizadorId: gerenciaUser.userId,
        usuarioAutorizadoId: dirTecnicoUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'aprobacion',
        nivel: 2,
        esActivo: true,
      },

      // ============================================
      // FLUJO 4: Analistas/Coordinadores → Director Área → Gerencia
      // ============================================

      // Analista PMO → Director PMO
      {
        usuarioAutorizadorId: dirPMOUser.userId,
        usuarioAutorizadoId: analistaPMOUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // Analista Comercial → Director Comercial
      {
        usuarioAutorizadorId: dirComercialUser.userId,
        usuarioAutorizadoId: analistaComercialUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // Analista Jurídico → Director Jurídico
      {
        usuarioAutorizadorId: dirJuridicoUser.userId,
        usuarioAutorizadoId: analistaJuridicoUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // Coordinador Jurídico → Director Jurídico
      {
        usuarioAutorizadorId: dirJuridicoUser.userId,
        usuarioAutorizadoId: coordJuridicoUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // Analista Administrativo → Director Financiero
      {
        usuarioAutorizadorId: dirFinancieroUser.userId,
        usuarioAutorizadoId: analistaAdminUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // Coordinador Financiero → Director Financiero
      {
        usuarioAutorizadorId: dirFinancieroUser.userId,
        usuarioAutorizadoId: coordFinancieroUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'revision',
        nivel: 1,
        esActivo: true,
      },

      // Directores de Área → Gerencia (aprobación nivel 2)
      {
        usuarioAutorizadorId: gerenciaUser.userId,
        usuarioAutorizadoId: dirPMOUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'aprobacion',
        nivel: 2,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: gerenciaUser.userId,
        usuarioAutorizadoId: dirComercialUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'aprobacion',
        nivel: 2,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: gerenciaUser.userId,
        usuarioAutorizadoId: dirJuridicoUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'aprobacion',
        nivel: 2,
        esActivo: true,
      },
      {
        usuarioAutorizadorId: gerenciaUser.userId,
        usuarioAutorizadoId: dirFinancieroUser.userId,
        gestionId: comprasGestion!.gestionId,
        tipoAutorizacion: 'aprobacion',
        nivel: 2,
        esActivo: true,
      },
    ];

    const authorizations =
      await authorizationRepository.save(authorizationsData);
    console.log(`✅ Created ${authorizations.length} authorizations`);

    // ============================================
    // 16. SEED ROLE PERMISSIONS (permisos por rol para módulo Compras)
    // ============================================
    console.log('Seeding role permissions...');

    const verPermission = permissions.find((p) => p.nombrePermiso === 'Ver')!;
    const crearPermission = permissions.find(
      (p) => p.nombrePermiso === 'Crear',
    )!;
    const revisarPermission = permissions.find(
      (p) => p.nombrePermiso === 'Revisar',
    )!;
    const aprobarPermission = permissions.find(
      (p) => p.nombrePermiso === 'Aprobar',
    )!;
    const cotizarPermission = permissions.find(
      (p) => p.nombrePermiso === 'Cotizar',
    )!;

    const rolePermissionsData: any[] = [];

    // Función helper para agregar permisos a un rol
    const addRolePermissions = (roleName: string, permissionNames: string[]) => {
      const role = roles.find((r) => r.nombreRol === roleName);
      if (!role) return;

      permissionNames.forEach((permName) => {
        const permission = permissions.find((p) => p.nombrePermiso === permName);
        if (permission) {
          rolePermissionsData.push({
            rolId: role.rolId,
            permisoId: permission.permisoId,
          });
        }
      });
    };

    // PQRS (todos los municipios): Ver, Crear
    addRolePermissions('PQRS El Cerrito', ['Ver', 'Crear']);
    addRolePermissions('PQRS Guacarí', ['Ver', 'Crear']);
    addRolePermissions('PQRS Circasia', ['Ver', 'Crear']);
    addRolePermissions('PQRS Quimbaya', ['Ver', 'Crear']);
    addRolePermissions('PQRS Jericó', ['Ver', 'Crear']);
    addRolePermissions('PQRS Ciudad Bolívar', ['Ver', 'Crear']);
    addRolePermissions('PQRS Tarso', ['Ver', 'Crear']);
    addRolePermissions('PQRS Pueblo Rico', ['Ver', 'Crear']);
    addRolePermissions('PQRS Santa Bárbara', ['Ver', 'Crear']);
    addRolePermissions('PQRS Puerto Asís', ['Ver', 'Crear']);

    // Directores de Proyecto: Ver, Crear, Revisar
    addRolePermissions('Director de Proyecto Antioquia', [
      'Ver',
      'Crear',
      'Revisar',
    ]);
    addRolePermissions('Director de Proyecto Quindío', [
      'Ver',
      'Crear',
      'Revisar',
    ]);
    addRolePermissions('Director de Proyecto Valle', ['Ver', 'Crear', 'Revisar']);
    addRolePermissions('Director de Proyecto Putumayo', [
      'Ver',
      'Crear',
      'Revisar',
    ]);

    // Analistas y Coordinadores: Ver, Crear
    addRolePermissions('Analista PMO', ['Ver', 'Crear']);
    addRolePermissions('Analista Comercial', ['Ver', 'Crear']);
    addRolePermissions('Analista Jurídico', ['Ver', 'Crear']);
    addRolePermissions('Analista Administrativo', ['Ver', 'Crear']);
    addRolePermissions('Coordinador Financiero', ['Ver', 'Crear']);
    addRolePermissions('Coordinador Jurídico', ['Ver', 'Crear']);

    // Directores de Área: Ver, Crear, Revisar
    addRolePermissions('Director PMO', ['Ver', 'Crear', 'Revisar']);
    addRolePermissions('Director Comercial', ['Ver', 'Crear', 'Revisar']);
    addRolePermissions('Director Jurídico', ['Ver', 'Crear', 'Revisar']);
    addRolePermissions('Director Financiero y Administrativo', [
      'Ver',
      'Crear',
      'Revisar',
    ]);

    // Director Técnico: Ver, Crear, Revisar
    addRolePermissions('Director Técnico', ['Ver', 'Crear', 'Revisar']);

    // Gerencia: Ver, Aprobar
    addRolePermissions('Gerencia', ['Ver', 'Aprobar']);

    // Compras: Ver, Cotizar
    addRolePermissions('Compras', ['Ver', 'Cotizar']);

    const rolePermissions =
      await rolePermissionRepository.save(rolePermissionsData);
    console.log(`✅ Created ${rolePermissions.length} role permissions`);

    // ============================================
    // RESUMEN FINAL
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('✅ Seeding completed successfully!');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   - ${roles.length} roles`);
    console.log(`   - ${permissions.length} permissions`);
    console.log(`   - ${rolePermissions.length} role permissions`);
    console.log(`   - ${gestiones.length} gestiones`);
    console.log(`   - ${companies.length} companies`);
    console.log(`   - ${projects.length} projects`);
    console.log(`   - ${operationCenters.length} operation centers`);
    console.log(`   - ${projectCodes.length} project codes`);
    console.log(`   - ${requisitionPrefixes.length} requisition prefixes`);
    console.log(`   - ${requisitionSequences.length} requisition sequences`);
    console.log(`   - ${requisitionStatuses.length} requisition statuses`);
    console.log(`   - ${materialGroups.length} material groups`);
    console.log(`   - ${materials.length} materials`);
    console.log(`   - ${suppliers.length} suppliers`);
    console.log(`   - ${users.length} test users (27 roles completos)`);
    console.log(`   - ${authorizations.length} authorizations (cadenas completas)`);
    console.log('\n🔑 Credenciales de prueba (Password: Canalco2025!):');
    console.log('\n   GERENCIA:');
    console.log('   - gerencia@canalcongroup.com');
    console.log('\n   DIRECTORES DE ÁREA:');
    console.log('   - director.pmo@canalcongroup.com');
    console.log('   - director.comercial@canalcongroup.com');
    console.log('   - director.juridico@canalcongroup.com');
    console.log('   - director.tecnico@canalcongroup.com');
    console.log('   - director.financiero@canalcongroup.com');
    console.log('\n   DIRECTORES DE PROYECTO:');
    console.log('   - director.antioquia@canalcongroup.com');
    console.log('   - director.quindio@canalcongroup.com');
    console.log('   - director.valle@canalcongroup.com');
    console.log('   - director.putumayo@canalcongroup.com');
    console.log('\n   ANALISTAS/COORDINADORES:');
    console.log('   - analista.pmo@canalcongroup.com');
    console.log('   - analista.comercial@canalcongroup.com');
    console.log('   - analista.juridico@canalcongroup.com');
    console.log('   - analista.admin@canalcongroup.com');
    console.log('   - coordinador.financiero@canalcongroup.com');
    console.log('   - coordinador.juridico@canalcongroup.com');
    console.log('\n   PQRS (10 municipios):');
    console.log('   - pqrs.elcerrito@canalcongroup.com');
    console.log('   - pqrs.guacari@canalcongroup.com');
    console.log('   - pqrs.circasia@canalcongroup.com');
    console.log('   - pqrs.quimbaya@canalcongroup.com');
    console.log('   - pqrs.jerico@canalcongroup.com');
    console.log('   - pqrs.ciudadbolivar@canalcongroup.com');
    console.log('   - pqrs.tarso@canalcongroup.com');
    console.log('   - pqrs.pueblorico@canalcongroup.com');
    console.log('   - pqrs.santabarbara@canalcongroup.com');
    console.log('   - pqrs.puertoasis@canalcongroup.com');
    console.log('\n   COMPRAS:');
    console.log('   - compras@canalcongroup.com');
    console.log('\n' + '='.repeat(50) + '\n');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

seed();
