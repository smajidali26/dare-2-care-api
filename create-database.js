const { Client } = require('pg');

async function createDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Summer@2026.',
    database: 'postgres', // Connect to default database first
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'dare2care'"
    );

    if (result.rows.length > 0) {
      console.log('✅ Database "dare2care" already exists');
    } else {
      // Create database
      await client.query('CREATE DATABASE dare2care');
      console.log('✅ Database "dare2care" created successfully');
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

createDatabase();
