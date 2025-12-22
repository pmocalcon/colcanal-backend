import * as fs from 'fs';
import * as path from 'path';
import dataSource from '../data-source';

interface SupplierRow {
  name: string;
  nitCc: string;
  phone: string;
  address: string;
  city: string;
  email?: string;
  contactPerson?: string;
}

interface ImportStats {
  suppliersCreated: number;
  suppliersSkipped: number;
  suppliersUpdated: number;
  errors: string[];
}

async function importSuppliers() {
  const stats: ImportStats = {
    suppliersCreated: 0,
    suppliersSkipped: 0,
    suppliersUpdated: 0,
    errors: [],
  };

  try {
    // Obtener ruta del CSV desde argumentos o usar default
    const csvPath = process.argv[2] || path.join(process.cwd(), 'suppliers.csv');
    const updateExisting = process.argv.includes('--update');

    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Archivo no encontrado: ${csvPath}`);
      console.log('\nUso: npx ts-node src/database/scripts/import-suppliers.ts <ruta-csv> [--update]');
      console.log('\nOpciones:');
      console.log('  --update    Actualizar proveedores existentes (por NIT/CC)');
      console.log('\nFormato CSV requerido:');
      console.log('  name;nit_cc;phone;address;city;email;contact_person');
      console.log('\nEjemplo:');
      console.log('  npx ts-node src/database/scripts/import-suppliers.ts "./proveedores.csv"');
      process.exit(1);
    }

    console.log(`📂 Leyendo archivo: ${csvPath}`);
    if (updateExisting) {
      console.log('⚠️  Modo actualización activado: se actualizarán proveedores existentes');
    }

    // Leer y parsear CSV
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    // Detectar separador (punto y coma o coma)
    const header = lines[0];
    const separator = header.includes(';') ? ';' : ',';
    console.log(`📝 Separador detectado: "${separator}"`);

    // Parsear header - soportar varios formatos de nombres de columna
    const headers = header.split(separator).map(h =>
      h.trim().toLowerCase().replace(/['"]/g, '')
    );

    // Mapear nombres de columnas (soporta español e inglés)
    const getColumnIndex = (names: string[]): number => {
      for (const name of names) {
        const idx = headers.indexOf(name);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const nameIdx = getColumnIndex(['name', 'nombre', 'razon_social', 'razon social']);
    const nitIdx = getColumnIndex(['nit_cc', 'nit', 'cc', 'nit/cc', 'documento', 'identificacion']);
    const phoneIdx = getColumnIndex(['phone', 'telefono', 'tel', 'celular', 'movil']);
    const addressIdx = getColumnIndex(['address', 'direccion', 'dir']);
    const cityIdx = getColumnIndex(['city', 'ciudad', 'municipio']);
    const emailIdx = getColumnIndex(['email', 'correo', 'e-mail']);
    const contactIdx = getColumnIndex(['contact_person', 'contacto', 'persona_contacto', 'representante']);

    // Validar columnas requeridas
    const requiredColumns = [
      { name: 'name/nombre', idx: nameIdx },
      { name: 'nit_cc/nit', idx: nitIdx },
      { name: 'phone/telefono', idx: phoneIdx },
      { name: 'address/direccion', idx: addressIdx },
      { name: 'city/ciudad', idx: cityIdx },
    ];

    const missingColumns = requiredColumns.filter(c => c.idx === -1);
    if (missingColumns.length > 0) {
      console.error('❌ Faltan columnas requeridas:');
      missingColumns.forEach(c => console.log(`   - ${c.name}`));
      console.log(`\n   Columnas encontradas: ${headers.join(', ')}`);
      process.exit(1);
    }

    // Parsear filas de datos
    const suppliers: SupplierRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = parseCSVLine(line, separator);

      const name = parts[nameIdx]?.trim();
      const nitCc = parts[nitIdx]?.trim();
      const phone = parts[phoneIdx]?.trim() || 'N/A';
      const address = parts[addressIdx]?.trim() || 'N/A';
      const city = parts[cityIdx]?.trim() || 'N/A';
      const email = emailIdx !== -1 ? parts[emailIdx]?.trim() : undefined;
      const contactPerson = contactIdx !== -1 ? parts[contactIdx]?.trim() : undefined;

      if (name && nitCc) {
        suppliers.push({
          name,
          nitCc,
          phone,
          address,
          city,
          email: email || undefined,
          contactPerson: contactPerson || undefined,
        });
      } else {
        stats.errors.push(`Línea ${i + 1}: Nombre o NIT/CC vacíos`);
      }
    }

    console.log(`📊 Proveedores a procesar: ${suppliers.length}`);

    // Conectar a la base de datos
    await dataSource.initialize();
    console.log('\n✅ Conexión a la base de datos establecida');

    const queryRunner = dataSource.createQueryRunner();

    // Importar proveedores
    console.log('\n🏢 Importando proveedores...');

    for (const supplier of suppliers) {
      // Verificar si el NIT/CC ya existe
      const existing = await queryRunner.query(
        `SELECT supplier_id FROM suppliers WHERE nit_cc = $1`,
        [supplier.nitCc]
      );

      if (existing.length > 0) {
        if (updateExisting) {
          // Actualizar proveedor existente
          await queryRunner.query(
            `UPDATE suppliers SET
              name = $1,
              phone = $2,
              address = $3,
              city = $4,
              email = $5,
              contact_person = $6,
              updated_at = NOW()
            WHERE nit_cc = $7`,
            [
              supplier.name,
              supplier.phone,
              supplier.address,
              supplier.city,
              supplier.email || null,
              supplier.contactPerson || null,
              supplier.nitCc,
            ]
          );
          stats.suppliersUpdated++;
        } else {
          stats.suppliersSkipped++;
        }
      } else {
        // Insertar nuevo proveedor
        await queryRunner.query(
          `INSERT INTO suppliers (name, nit_cc, phone, address, city, email, contact_person, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
          [
            supplier.name,
            supplier.nitCc,
            supplier.phone,
            supplier.address,
            supplier.city,
            supplier.email || null,
            supplier.contactPerson || null,
          ]
        );
        stats.suppliersCreated++;
      }
    }

    await queryRunner.release();
    await dataSource.destroy();

    // Mostrar resumen
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(50));
    console.log(`   ✅ Proveedores creados:     ${stats.suppliersCreated}`);
    console.log(`   🔄 Proveedores actualizados: ${stats.suppliersUpdated}`);
    console.log(`   ⏭️  Proveedores omitidos:    ${stats.suppliersSkipped} (ya existían)`);

    if (stats.errors.length > 0) {
      console.log(`   ❌ Errores:                 ${stats.errors.length}`);
      console.log('\n⚠️  Errores encontrados:');
      stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      if (stats.errors.length > 10) {
        console.log(`   ... y ${stats.errors.length - 10} más`);
      }
    }

    console.log('='.repeat(50));
    console.log('✅ Importación completada');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Función auxiliar para parsear líneas CSV con campos entre comillas
function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
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
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

importSuppliers();
