import * as fs from 'fs';
import * as path from 'path';

interface MaterialRow {
  code: string;
  description: string;
  group: string;
}

function generateSQL() {
  // Obtener ruta del CSV desde argumentos o usar default
  const csvPath = process.argv[2] || path.join(process.cwd(), 'materials.csv');
  const outputPath = process.argv[3] || path.join(process.cwd(), 'import-materials.sql');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Archivo no encontrado: ${csvPath}`);
    console.log('\nUso: npx ts-node src/database/scripts/generate-materials-sql.ts <ruta-csv> [ruta-sql-salida]');
    process.exit(1);
  }

  console.log(`📂 Leyendo archivo: ${csvPath}`);

  // Leer y parsear CSV
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());

  // Detectar separador
  const header = lines[0];
  const separator = header.includes(';') ? ';' : ',';
  console.log(`📝 Separador detectado: "${separator}"`);

  // Parsear header
  const headers = header.split(separator).map(h => h.trim().toLowerCase());
  const codeIdx = headers.indexOf('code');
  const descIdx = headers.indexOf('description');
  const groupIdx = headers.indexOf('group');

  if (codeIdx === -1 || descIdx === -1 || groupIdx === -1) {
    console.error('❌ El CSV debe tener columnas: code, description, group');
    process.exit(1);
  }

  // Parsear filas
  const materials: MaterialRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i].trim(), separator);
    if (parts.length >= 3) {
      const code = parts[codeIdx]?.trim();
      const description = parts[descIdx]?.trim();
      const group = parts[groupIdx]?.trim();
      if (code && description && group) {
        materials.push({ code, description, group });
      }
    }
  }

  console.log(`📊 Materiales encontrados: ${materials.length}`);

  // Obtener grupos únicos
  const uniqueGroups = [...new Set(materials.map(m => m.group))];
  console.log(`📁 Grupos encontrados: ${uniqueGroups.length}`);

  // Generar SQL
  let sql = `-- ================================================
-- Script de importación de materiales
-- Generado: ${new Date().toISOString()}
-- Total materiales: ${materials.length}
-- Total grupos: ${uniqueGroups.length}
-- ================================================

-- IMPORTANTE: Este script usa la categoría con ID 1 (Pendiente) por defecto
-- Si necesitas otra categoría, cambia el valor de @default_category_id

BEGIN;

-- ================================================
-- 1. CREAR GRUPOS QUE NO EXISTAN
-- ================================================
`;

  for (const groupName of uniqueGroups) {
    const escapedName = escapeSQL(groupName);
    sql += `
INSERT INTO material_groups (name, category_id)
SELECT '${escapedName}', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('${escapedName}'));
`;
  }

  sql += `
-- ================================================
-- 2. INSERTAR MATERIALES (omite duplicados por código)
-- ================================================
`;

  for (const material of materials) {
    const escapedCode = escapeSQL(material.code);
    const escapedDesc = escapeSQL(material.description);
    const escapedGroup = escapeSQL(material.group);

    sql += `
INSERT INTO materials (code, description, group_id)
SELECT '${escapedCode}', '${escapedDesc}', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('${escapedGroup}')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '${escapedCode}');
`;
  }

  sql += `
COMMIT;

-- ================================================
-- 3. VERIFICAR RESULTADOS
-- ================================================
SELECT 'Grupos totales:' as info, COUNT(*) as total FROM material_groups;
SELECT 'Materiales totales:' as info, COUNT(*) as total FROM materials;
SELECT g.name as grupo, COUNT(m.material_id) as materiales
FROM material_groups g
LEFT JOIN materials m ON g.group_id = m.group_id
GROUP BY g.name
ORDER BY g.name;
`;

  // Escribir archivo SQL
  fs.writeFileSync(outputPath, sql, 'utf-8');

  console.log(`\n✅ Archivo SQL generado: ${outputPath}`);
  console.log(`\n📋 Instrucciones:`);
  console.log(`   1. Ve al dashboard de Render`);
  console.log(`   2. Abre la consola PSQL de tu base de datos`);
  console.log(`   3. Copia y pega el contenido del archivo SQL`);
  console.log(`   4. O usa: \\i ${outputPath}`);
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

generateSQL();
