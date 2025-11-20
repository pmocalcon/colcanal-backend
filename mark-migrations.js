const { Client } = require('pg');

async function markMigrationsAsExecuted() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'canalco',
    password: 'canalco',
    database: 'canalco',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Lista de migraciones anteriores que ya existen en la DB pero no están registradas
    const migrations = [
      { timestamp: 1762390207486, name: 'Migration1762390207486' },
      { timestamp: 1762390207487, name: 'UpdateRequisitionsAndAddApprovals1762390207487' },
      { timestamp: 1762390207488, name: 'AddCategoryToRoles1762390207488' },
      { timestamp: 1762447647420, name: 'AddSuppliersAndQuotations1762447647420' },
      { timestamp: 1762456278436, name: 'Migration1762456278436' },
      { timestamp: 1762500000000, name: 'AddMaterialReceipts1762500000000' },
      { timestamp: 1762510000000, name: 'AddMissingIndexes1762510000000' },
      { timestamp: 1762520000000, name: 'AddObraFieldsToRequisitions1762520000000' },
      { timestamp: 1762710558838, name: 'AddPriceFieldsToQuotations1762710558838' },
      { timestamp: 1762730000000, name: 'AddRequisitionItemApprovals1762730000000' },
    ];

    for (const migration of migrations) {
      const result = await client.query(
        'INSERT INTO migrations (timestamp, name) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
        [migration.timestamp, migration.name]
      );
      if (result.rowCount > 0) {
        console.log(`✓ Marked ${migration.name} as executed`);
      } else {
        console.log(`- ${migration.name} already marked`);
      }
    }

    console.log('\n✅ All previous migrations marked as executed');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

markMigrationsAsExecuted();
