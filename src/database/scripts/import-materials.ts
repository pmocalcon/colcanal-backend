import * as fs from "fs";
import * as path from "path";
import dataSource from "../data-source";

interface MaterialRow {
  code: string;
  description: string;
  group: string;
}

interface ImportStats {
  materialsCreated: number;
  materialsSkipped: number;
  groupsCreated: number;
  errors: string[];
}

async function importMaterials() {
  const stats: ImportStats = {
    materialsCreated: 0,
    materialsSkipped: 0,
    groupsCreated: 0,
    errors: [],
  };

  try {
    // Obtener ruta del CSV desde argumentos o usar default
    const csvPath =
      process.argv[2] || path.join(process.cwd(), "materials.csv");

    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Archivo no encontrado: ${csvPath}`);
      console.log(
        "\nUso: npx ts-node src/database/scripts/import-materials.ts <ruta-csv>",
      );
      console.log(
        'Ejemplo: npx ts-node src/database/scripts/import-materials.ts "./Book 5(Hoja1).csv"',
      );
      process.exit(1);
    }

    console.log(`📂 Leyendo archivo: ${csvPath}`);

    // Leer y parsear CSV
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split("\n").filter((line) => line.trim());

    // Detectar separador (punto y coma o coma)
    const header = lines[0];
    const separator = header.includes(";") ? ";" : ",";
    console.log(`📝 Separador detectado: "${separator}"`);

    // Parsear header
    const headers = header.split(separator).map((h) => h.trim().toLowerCase());
    const codeIdx = headers.indexOf("code");
    const descIdx = headers.indexOf("description");
    const groupIdx = headers.indexOf("group");

    if (codeIdx === -1 || descIdx === -1 || groupIdx === -1) {
      console.error("❌ El CSV debe tener columnas: code, description, group");
      console.log(`   Columnas encontradas: ${headers.join(", ")}`);
      process.exit(1);
    }

    // Parsear filas de datos
    const materials: MaterialRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Manejo básico de campos con comillas
      const parts = parseCSVLine(line, separator);

      if (parts.length >= 3) {
        const code = parts[codeIdx]?.trim();
        const description = parts[descIdx]?.trim();
        const group = parts[groupIdx]?.trim();

        if (code && description && group) {
          materials.push({ code, description, group });
        } else {
          stats.errors.push(`Línea ${i + 1}: Campos vacíos`);
        }
      } else {
        stats.errors.push(`Línea ${i + 1}: Formato inválido`);
      }
    }

    console.log(`📊 Materiales a procesar: ${materials.length}`);

    // Obtener grupos únicos
    const uniqueGroups = [...new Set(materials.map((m) => m.group))];
    console.log(`📁 Grupos encontrados: ${uniqueGroups.length}`);
    uniqueGroups.forEach((g) => console.log(`   - ${g}`));

    // Conectar a la base de datos
    await dataSource.initialize();
    console.log("\n✅ Conexión a la base de datos establecida");

    const queryRunner = dataSource.createQueryRunner();

    // Obtener categoría "Pendiente" (categoryId: 1) o la primera disponible
    const categoryResult = await queryRunner.query(
      `SELECT category_id FROM material_categories ORDER BY category_id LIMIT 1`,
    );
    const defaultCategoryId = categoryResult[0]?.category_id || 1;
    console.log(`📂 Categoría por defecto: ${defaultCategoryId}`);

    // Crear grupos que no existan
    console.log("\n🔧 Procesando grupos...");
    const groupMap: Map<string, number> = new Map();

    for (const groupName of uniqueGroups) {
      // Buscar si el grupo ya existe
      const existingGroup = await queryRunner.query(
        `SELECT group_id FROM material_groups WHERE UPPER(name) = UPPER($1)`,
        [groupName],
      );

      if (existingGroup.length > 0) {
        groupMap.set(groupName, existingGroup[0].group_id);
        console.log(
          `   ✓ Grupo existente: ${groupName} (ID: ${existingGroup[0].group_id})`,
        );
      } else {
        // Crear nuevo grupo
        const newGroup = await queryRunner.query(
          `INSERT INTO material_groups (name, category_id) VALUES ($1, $2) RETURNING group_id`,
          [groupName, defaultCategoryId],
        );
        groupMap.set(groupName, newGroup[0].group_id);
        stats.groupsCreated++;
        console.log(
          `   ✚ Grupo creado: ${groupName} (ID: ${newGroup[0].group_id})`,
        );
      }
    }

    // Importar materiales
    console.log("\n📦 Importando materiales...");

    for (const material of materials) {
      const groupId = groupMap.get(material.group);

      if (!groupId) {
        stats.errors.push(`Material ${material.code}: Grupo no encontrado`);
        continue;
      }

      // Verificar si el código ya existe
      const existing = await queryRunner.query(
        `SELECT material_id FROM materials WHERE code = $1`,
        [material.code],
      );

      if (existing.length > 0) {
        stats.materialsSkipped++;
      } else {
        // Insertar nuevo material
        await queryRunner.query(
          `INSERT INTO materials (code, description, group_id) VALUES ($1, $2, $3)`,
          [material.code, material.description, groupId],
        );
        stats.materialsCreated++;
      }
    }

    await queryRunner.release();
    await dataSource.destroy();

    // Mostrar resumen
    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMEN DE IMPORTACIÓN");
    console.log("=".repeat(50));
    console.log(`   ✅ Materiales creados:  ${stats.materialsCreated}`);
    console.log(
      `   ⏭️  Materiales omitidos: ${stats.materialsSkipped} (ya existían)`,
    );
    console.log(`   📁 Grupos creados:      ${stats.groupsCreated}`);

    if (stats.errors.length > 0) {
      console.log(`   ❌ Errores:             ${stats.errors.length}`);
      console.log("\n⚠️  Errores encontrados:");
      stats.errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
      if (stats.errors.length > 10) {
        console.log(`   ... y ${stats.errors.length - 10} más`);
      }
    }

    console.log("=".repeat(50));
    console.log("✅ Importación completada");
  } catch (error) {
    console.error("❌ Error durante la importación:", error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Función auxiliar para parsear líneas CSV con campos entre comillas
function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

importMaterials();
