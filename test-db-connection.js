const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'canalco',
  password: 'canalco',
  database: 'postgres',
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Conexión exitosa a PostgreSQL!');
    const result = await client.query('SELECT current_user, version()');
    console.log('Usuario actual:', result.rows[0].current_user);
    console.log('Versión:', result.rows[0].version);
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
}

testConnection();
