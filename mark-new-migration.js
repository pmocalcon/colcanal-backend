const { Client } = require('pg');

async function markMigration() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'canalco',
    password: 'canalco',
    database: 'canalco',
  });

  try {
    await client.connect();
    const result = await client.query(
      'INSERT INTO migrations (timestamp, name) VALUES ($1, $2) RETURNING *',
      [1762740000000, 'AddMaterialPriceHistory1762740000000']
    );
    console.log('✅ Migration marked:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

markMigration();
