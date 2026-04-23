import { config } from "dotenv";
import dataSource from "../data-source";
import { Company } from "../entities/company.entity";
import { Project } from "../entities/project.entity";

config();

/**
 * Script de migración para:
 * 1. Cambiar "Administrativo" a "Oficina Principal"
 * 2. Agregar dos nuevas empresas: "Uniones y Alianzas" e "Inversiones Garcés Escalante"
 */
async function updateCompaniesAndProjects() {
  try {
    console.log("🔄 Iniciando migración...\n");

    await dataSource.initialize();
    console.log("✅ Conectado a la base de datos\n");

    const companyRepository = dataSource.getRepository(Company);
    const projectRepository = dataSource.getRepository(Project);

    // ============================================
    // 1. ACTUALIZAR PROYECTO "Administrativo" → "Oficina Principal"
    // ============================================
    console.log("📝 Paso 1: Actualizando nombre del proyecto...");

    const projectToUpdate = await projectRepository.findOne({
      where: { name: "Administrativo", companyId: 1 },
    });

    if (projectToUpdate) {
      projectToUpdate.name = "Oficina Principal";
      await projectRepository.save(projectToUpdate);
      console.log(
        '   ✅ Proyecto actualizado: "Administrativo" → "Oficina Principal"\n',
      );
    } else {
      console.log(
        '   ℹ️  Proyecto "Administrativo" no encontrado o ya actualizado\n',
      );
    }

    // ============================================
    // 2. AGREGAR NUEVAS EMPRESAS
    // ============================================
    console.log("📝 Paso 2: Agregando nuevas empresas...");

    const newCompanies = [
      { name: "Uniones y Alianzas" },
      { name: "Inversiones Garcés Escalante" },
    ];

    for (const companyData of newCompanies) {
      // Verificar si la empresa ya existe
      const existingCompany = await companyRepository.findOne({
        where: { name: companyData.name },
      });

      if (!existingCompany) {
        const newCompany = companyRepository.create(companyData);
        await companyRepository.save(newCompany);
        console.log(`   ✅ Empresa agregada: "${companyData.name}"`);
      } else {
        console.log(`   ℹ️  Empresa "${companyData.name}" ya existe`);
      }
    }

    console.log("\n📊 Verificando estado final...");

    // Mostrar todas las empresas
    const allCompanies = await companyRepository.find({
      order: { companyId: "ASC" },
    });
    console.log(`\n   Total de empresas: ${allCompanies.length}`);
    console.log("   ─".repeat(40));
    allCompanies.forEach((company) => {
      console.log(`   ${company.companyId}. ${company.name}`);
    });
    console.log("   ─".repeat(40));

    // Mostrar proyectos de Canales & Contactos
    const canalesCompany = allCompanies.find((c) =>
      c.name.includes("Canales & Contactos"),
    );

    if (canalesCompany) {
      const projects = await projectRepository.find({
        where: { companyId: canalesCompany.companyId },
        order: { projectId: "ASC" },
      });

      console.log(`\n   Proyectos de Canales & Contactos: ${projects.length}`);
      console.log("   ─".repeat(40));
      projects.forEach((project) => {
        console.log(`   ${project.projectId}. ${project.name}`);
      });
      console.log("   ─".repeat(40));
    }

    await dataSource.destroy();
    console.log("\n✅ Migración completada exitosamente!\n");
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Comentado para evitar ejecución automática durante migraciones
// Ejecutar manualmente con: npm run migrate:companies
// updateCompaniesAndProjects();
