import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';

async function addUser() {
  try {
    await dataSource.initialize();
    console.log('✅ Conexión a la base de datos establecida');

    const queryRunner = dataSource.createQueryRunner();

    // Obtener el rol_id de 'Gerencia de Proyectos'
    const roleResult = await queryRunner.query(
      `SELECT rol_id FROM roles WHERE nombre_rol = $1`,
      ['Gerencia de Proyectos'],
    );

    if (roleResult.length === 0) {
      console.log('❌ Rol "Gerencia de Proyectos" no encontrado');
      await dataSource.destroy();
      return;
    }

    const rolId = roleResult[0].rol_id;
    console.log(`✅ Rol encontrado con ID: ${rolId}`);

    // Verificar si el usuario ya existe
    const existingUser = await queryRunner.query(
      `SELECT user_id FROM users WHERE email = $1`,
      ['gerencia.proyectos@canalcongroup.com'],
    );

    if (existingUser.length > 0) {
      console.log('✅ El usuario gerencia.proyectos@canalcongroup.com ya existe');
      await dataSource.destroy();
      return;
    }

    // Crear el hash de la contraseña
    const hashedPassword = await bcrypt.hash('Canalco2025!', 10);

    // Crear el usuario
    await queryRunner.query(
      `INSERT INTO users (email, password, nombre, cargo, rol_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'gerencia.proyectos@canalcongroup.com',
        hashedPassword,
        'Carlos Ramírez',
        'Gerente de Proyectos',
        rolId,
        true,
      ],
    );

    console.log('✅ Usuario gerencia.proyectos@canalcongroup.com creado exitosamente');
    console.log('   Email: gerencia.proyectos@canalcongroup.com');
    console.log('   Password: Canalco2025!');

    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

addUser();
