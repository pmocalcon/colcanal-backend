import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../src/database/entities/user.entity';
import { Role } from '../src/database/entities/role.entity';

// ============================================
// CONFIGURACIÓN
// ============================================

const VALID_ROLES = [
  'Gerencia',
  'Gerencia de Proyectos',
  'Director PMO',
  'Director Comercial',
  'Director Jurídico',
  'Director Técnico',
  'Director Financiero y Administrativo',
  'Director de Proyecto Antioquia',
  'Director de Proyecto Quindío',
  'Director de Proyecto Valle',
  'Director de Proyecto Putumayo',
  'Analista PMO',
  'Analista Comercial',
  'Analista Jurídico',
  'Analista Administrativo',
  'Coordinador Financiero',
  'Coordinador Jurídico',
  'PQRS El Cerrito',
  'PQRS Guacarí',
  'PQRS Circasia',
  'PQRS Quimbaya',
  'PQRS Jericó',
  'PQRS Ciudad Bolívar',
  'PQRS Tarso',
  'PQRS Pueblo Rico',
  'PQRS Santa Bárbara',
  'PQRS Puerto Asís',
  'Compras',
];

const REQUIRED_DOMAIN = '@canalcongroup.com';
const MIN_PASSWORD_LENGTH = 6;

// ============================================
// INTERFACES
// ============================================

interface UserRow {
  email: string;
  nombre: string;
  cargo: string;
  rol: string;
  estado: string;
  password: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

interface MigrationResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdUsers: number;
  errors: ValidationError[];
  duplicateEmails: string[];
}

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.endsWith(REQUIRED_DOMAIN);
}

function validateEstado(estado: string): boolean {
  return estado === 'true' || estado === 'false' || estado === 'TRUE' || estado === 'FALSE';
}

function validatePassword(password: string): boolean {
  return Boolean(password && password.length >= MIN_PASSWORD_LENGTH);
}

function validateRow(row: UserRow, rowIndex: number, existingEmails: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validar email
  if (!row.email || row.email.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'email',
      value: row.email || '',
      error: 'El email es requerido',
    });
  } else if (!validateEmail(row.email)) {
    errors.push({
      row: rowIndex,
      field: 'email',
      value: row.email,
      error: `El email debe terminar en ${REQUIRED_DOMAIN}`,
    });
  } else if (existingEmails.has(row.email.toLowerCase())) {
    errors.push({
      row: rowIndex,
      field: 'email',
      value: row.email,
      error: 'Email duplicado en el archivo CSV',
    });
  }

  // Validar nombre
  if (!row.nombre || row.nombre.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'nombre',
      value: row.nombre || '',
      error: 'El nombre es requerido',
    });
  }

  // Validar cargo
  if (!row.cargo || row.cargo.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'cargo',
      value: row.cargo || '',
      error: 'El cargo es requerido',
    });
  }

  // Validar rol
  if (!row.rol || row.rol.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'rol',
      value: row.rol || '',
      error: 'El rol es requerido',
    });
  } else if (!VALID_ROLES.includes(row.rol)) {
    errors.push({
      row: rowIndex,
      field: 'rol',
      value: row.rol,
      error: `Rol inválido. Debe ser uno de: ${VALID_ROLES.join(', ')}`,
    });
  }

  // Validar estado
  if (!validateEstado(row.estado)) {
    errors.push({
      row: rowIndex,
      field: 'estado',
      value: row.estado,
      error: 'El estado debe ser "true" o "false"',
    });
  }

  // Validar contraseña
  if (!row.password || row.password.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'password',
      value: '',
      error: 'La contraseña es requerida',
    });
  } else if (!validatePassword(row.password)) {
    errors.push({
      row: rowIndex,
      field: 'password',
      value: '***',
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    });
  }

  return errors;
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function migrateUsers(csvFilePath: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    createdUsers: 0,
    errors: [],
    duplicateEmails: [],
  };

  try {
    // 1. Leer archivo CSV
    console.log('📖 Leyendo archivo CSV...');
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');

    const rows: UserRow[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    result.totalRows = rows.length;
    console.log(`✅ Se encontraron ${result.totalRows} filas en el CSV`);

    // 2. Validar datos
    console.log('\n🔍 Validando datos...');
    const existingEmails = new Set<string>();

    rows.forEach((row, index) => {
      const rowErrors = validateRow(row, index + 2, existingEmails); // +2 porque empieza en fila 2 (después del header)

      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors);
        result.invalidRows++;
      } else {
        result.validRows++;
        existingEmails.add(row.email.toLowerCase());
      }
    });

    console.log(`✅ Filas válidas: ${result.validRows}`);
    console.log(`❌ Filas inválidas: ${result.invalidRows}`);

    // Si hay errores de validación, mostrarlos y salir
    if (result.errors.length > 0) {
      console.log('\n❌ ERRORES DE VALIDACIÓN:');
      result.errors.forEach((error) => {
        console.log(`  Fila ${error.row}, Campo "${error.field}": ${error.error}`);
        if (error.value) {
          console.log(`    Valor: "${error.value}"`);
        }
      });
      return result;
    }

    // 3. Conectar a la base de datos
    console.log('\n🔌 Conectando a la base de datos...');
    const dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Role],
      synchronize: false,
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        timezone: 'America/Bogota',
      },
    });

    await dataSource.initialize();
    console.log('✅ Conectado a la base de datos');

    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);

    // 4. Verificar emails duplicados en la base de datos
    console.log('\n🔍 Verificando emails existentes en la base de datos...');
    for (const row of rows) {
      const existingUser = await userRepository.findOne({
        where: { email: row.email },
      });

      if (existingUser) {
        result.duplicateEmails.push(row.email);
      }
    }

    if (result.duplicateEmails.length > 0) {
      console.log('\n❌ EMAILS YA EXISTENTES EN LA BASE DE DATOS:');
      result.duplicateEmails.forEach((email) => {
        console.log(`  - ${email}`);
      });
      await dataSource.destroy();
      return result;
    }

    // 5. Cargar roles
    console.log('\n📥 Cargando roles...');
    const rolesMap = new Map<string, Role>();
    const roles = await roleRepository.find();

    roles.forEach((role) => {
      rolesMap.set(role.nombreRol, role);
    });
    console.log(`✅ Cargados ${roles.length} roles`);

    // 6. Crear usuarios
    console.log('\n👥 Creando usuarios...');

    for (const row of rows) {
      try {
        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(row.password, 10);

        // Obtener el rol
        const role = rolesMap.get(row.rol);
        if (!role) {
          console.log(`  ⚠️  Rol no encontrado: ${row.rol} para ${row.email}`);
          continue;
        }

        // Crear usuario
        const user = userRepository.create({
          email: row.email,
          password: hashedPassword,
          nombre: row.nombre,
          cargo: row.cargo,
          rolId: role.rolId,
          estado: row.estado.toLowerCase() === 'true',
        });

        await userRepository.save(user);
        result.createdUsers++;
        console.log(`  ✅ Usuario creado: ${row.email}`);
      } catch (error) {
        console.log(`  ❌ Error al crear usuario ${row.email}:`, error.message);
      }
    }

    // 7. Cerrar conexión
    await dataSource.destroy();
    console.log('\n✅ Conexión cerrada');

    result.success = result.createdUsers === result.validRows;

    return result;
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    throw error;
  }
}

// ============================================
// FUNCIÓN DE REPORTE
// ============================================

function generateReport(result: MigrationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORTE DE MIGRACIÓN');
  console.log('='.repeat(60));
  console.log(`Total de filas en CSV: ${result.totalRows}`);
  console.log(`Filas válidas: ${result.validRows}`);
  console.log(`Filas inválidas: ${result.invalidRows}`);
  console.log(`Usuarios creados: ${result.createdUsers}`);
  console.log(`Estado: ${result.success ? '✅ EXITOSO' : '❌ FALLIDO'}`);
  console.log('='.repeat(60));

  // Guardar reporte en archivo
  const reportPath = path.join(__dirname, `migration-report-${Date.now()}.txt`);
  const reportContent = `
REPORTE DE MIGRACIÓN DE USUARIOS
Fecha: ${new Date().toISOString()}

RESUMEN:
- Total de filas en CSV: ${result.totalRows}
- Filas válidas: ${result.validRows}
- Filas inválidas: ${result.invalidRows}
- Usuarios creados: ${result.createdUsers}
- Estado: ${result.success ? 'EXITOSO' : 'FALLIDO'}

${result.errors.length > 0 ? `
ERRORES DE VALIDACIÓN:
${result.errors.map(e => `  Fila ${e.row}, Campo "${e.field}": ${e.error} (Valor: "${e.value}")`).join('\n')}
` : ''}

${result.duplicateEmails.length > 0 ? `
EMAILS DUPLICADOS EN BASE DE DATOS:
${result.duplicateEmails.map(e => `  - ${e}`).join('\n')}
` : ''}
`;

  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n📄 Reporte guardado en: ${reportPath}`);
}

// ============================================
// EJECUCIÓN
// ============================================

async function main() {
  const csvFilePath = process.argv[2];

  if (!csvFilePath) {
    console.error('❌ Error: Debe proporcionar la ruta del archivo CSV');
    console.log('\nUso:');
    console.log('  npx ts-node scripts/migrate-users-from-csv.ts usuarios.csv');
    process.exit(1);
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Error: El archivo no existe: ${csvFilePath}`);
    process.exit(1);
  }

  try {
    const result = await migrateUsers(csvFilePath);
    generateReport(result);

    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error fatal durante la migración:', error);
    process.exit(1);
  }
}

main();
