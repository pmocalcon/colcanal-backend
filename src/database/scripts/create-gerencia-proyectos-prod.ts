/**
 * Script para crear el usuario de Gerencia de Proyectos en producción
 *
 * Ejecutar en Render con:
 * npm run create:gerencia-proyectos
 *
 * O directamente con:
 * npx ts-node -r tsconfig-paths/register src/database/scripts/create-gerencia-proyectos-prod.ts
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';

async function createGerenciaProyectosUser() {
  console.log('🚀 Iniciando creación de usuario Gerencia de Proyectos...\n');

  try {
    // Conectar a la base de datos
    await dataSource.initialize();
    console.log('✅ Conexión a la base de datos establecida');

    const queryRunner = dataSource.createQueryRunner();

    // 1. Verificar que el rol existe
    console.log('\n📋 Verificando rol "Gerencia de Proyectos"...');
    const roleResult = await queryRunner.query(
      `SELECT rol_id FROM roles WHERE nombre_rol = $1`,
      ['Gerencia de Proyectos'],
    );

    if (roleResult.length === 0) {
      console.log('❌ Error: El rol "Gerencia de Proyectos" no existe en la base de datos');
      console.log('   Por favor, asegúrate de que las migraciones se hayan ejecutado correctamente');
      await dataSource.destroy();
      process.exit(1);
    }

    const rolId = roleResult[0].rol_id;
    console.log(`✅ Rol encontrado (ID: ${rolId})`);

    // 2. Verificar si el usuario ya existe
    console.log('\n👤 Verificando si el usuario ya existe...');
    const existingUser = await queryRunner.query(
      `SELECT user_id, email, nombre FROM users WHERE email = $1`,
      ['gerencia.proyectos@canalcongroup.com'],
    );

    if (existingUser.length > 0) {
      console.log('ℹ️  El usuario ya existe:');
      console.log(`   ID: ${existingUser[0].user_id}`);
      console.log(`   Email: ${existingUser[0].email}`);
      console.log(`   Nombre: ${existingUser[0].nombre}`);
      console.log('\n✅ No es necesario crear el usuario');

      await queryRunner.release();
      await dataSource.destroy();
      return;
    }

    // 3. Crear el hash de la contraseña
    console.log('\n🔐 Generando hash de contraseña...');
    const password = 'Canalco2025!';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Hash generado');

    // 4. Crear el usuario
    console.log('\n💾 Creando usuario en la base de datos...');
    const result = await queryRunner.query(
      `INSERT INTO users (email, password, nombre, cargo, rol_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, email, nombre, cargo`,
      [
        'gerencia.proyectos@canalcongroup.com',
        hashedPassword,
        'Carlos Ramírez',
        'Gerente de Proyectos',
        rolId,
        true,
      ],
    );

    console.log('✅ Usuario creado exitosamente:\n');
    console.log('   📧 Email:    gerencia.proyectos@canalcongroup.com');
    console.log('   🔑 Password: Canalco2025!');
    console.log('   👤 Nombre:   Carlos Ramírez');
    console.log('   💼 Cargo:    Gerente de Proyectos');
    console.log(`   🆔 User ID:  ${result[0].user_id}`);

    console.log('\n⚠️  IMPORTANTE:');
    console.log('   Por seguridad, se recomienda cambiar la contraseña');
    console.log('   después del primer login en producción.\n');

    // 5. Verificar permisos del rol
    console.log('🔍 Verificando permisos del rol...');
    const permissions = await queryRunner.query(
      `SELECT p.nombre_permiso, p.descripcion
       FROM roles_permisos rp
       JOIN permisos p ON p.permiso_id = rp.permiso_id
       WHERE rp.rol_id = $1`,
      [rolId],
    );

    if (permissions.length > 0) {
      console.log('✅ Permisos asignados al rol:');
      permissions.forEach((perm: any) => {
        console.log(`   • ${perm.nombre_permiso}: ${perm.descripcion}`);
      });
    } else {
      console.log('⚠️  No se encontraron permisos asignados al rol');
    }

    // 6. Verificar gestiones del rol
    console.log('\n🔍 Verificando gestiones del rol...');
    const gestiones = await queryRunner.query(
      `SELECT g.nombre, g.slug
       FROM roles_gestiones rg
       JOIN gestiones g ON g.gestion_id = rg.gestion_id
       WHERE rg.rol_id = $1`,
      [rolId],
    );

    if (gestiones.length > 0) {
      console.log('✅ Gestiones asignadas al rol:');
      gestiones.forEach((gest: any) => {
        console.log(`   • ${gest.nombre} (${gest.slug})`);
      });
    } else {
      console.log('⚠️  No se encontraron gestiones asignadas al rol');
    }

    await queryRunner.release();
    await dataSource.destroy();

    console.log('\n🎉 Proceso completado exitosamente!\n');
  } catch (error) {
    console.error('\n❌ Error durante la creación del usuario:');
    console.error(error);

    try {
      await dataSource.destroy();
    } catch (e) {
      // Ignorar errores al cerrar la conexión
    }

    process.exit(1);
  }
}

// Ejecutar el script
createGerenciaProyectosUser();
