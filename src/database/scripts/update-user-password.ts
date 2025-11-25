/**
 * Script para actualizar la contraseña de un usuario existente
 *
 * Ejecutar en Render con:
 * npx ts-node -r tsconfig-paths/register src/database/scripts/update-user-password.ts gerencia.proyectos@canalcongroup.com Canalco2025!
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';

async function updatePassword() {
  const email = process.argv[2] || 'gerencia.proyectos@canalcongroup.com';
  const newPassword = process.argv[3] || 'Canalco2025!';

  console.log(`🔐 Actualizando contraseña para: ${email}\n`);

  try {
    await dataSource.initialize();
    console.log('✅ Conexión a la base de datos establecida');

    const queryRunner = dataSource.createQueryRunner();

    // Verificar que el usuario existe
    console.log('\n👤 Verificando usuario...');
    const existingUser = await queryRunner.query(
      `SELECT user_id, email, nombre FROM users WHERE email = $1`,
      [email],
    );

    if (existingUser.length === 0) {
      console.log(`❌ El usuario ${email} no existe`);
      await dataSource.destroy();
      process.exit(1);
    }

    console.log('✅ Usuario encontrado:');
    console.log(`   ID: ${existingUser[0].user_id}`);
    console.log(`   Email: ${existingUser[0].email}`);
    console.log(`   Nombre: ${existingUser[0].nombre}`);

    // Generar nuevo hash
    console.log('\n🔐 Generando hash de nueva contraseña...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('✅ Hash generado');

    // Actualizar la contraseña
    console.log('\n💾 Actualizando contraseña en la base de datos...');
    await queryRunner.query(
      `UPDATE users SET password = $1 WHERE email = $2`,
      [hashedPassword, email],
    );

    console.log('✅ Contraseña actualizada exitosamente:\n');
    console.log(`   📧 Email:    ${email}`);
    console.log(`   🔑 Nueva Password: ${newPassword}`);

    console.log('\n⚠️  IMPORTANTE:');
    console.log('   El usuario puede iniciar sesión con la nueva contraseña.\n');

    await queryRunner.release();
    await dataSource.destroy();

    console.log('🎉 Proceso completado exitosamente!\n');
  } catch (error) {
    console.error('\n❌ Error durante la actualización:');
    console.error(error);

    try {
      await dataSource.destroy();
    } catch (e) {
      // Ignorar errores al cerrar la conexión
    }

    process.exit(1);
  }
}

updatePassword();
