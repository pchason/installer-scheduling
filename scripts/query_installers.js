const { drizzle } = require('drizzle-orm/node-postgres');
const { installers } = require('./lib/database/schema');
const { sql } = require('drizzle-orm');
const pkg = require('pg');
const { Client } = pkg;

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  const db = drizzle(client);

  // Query all installers grouped by trade
  const result = await db.select({
    trade: installers.trade,
    count: sql`count(*)`,
  }).from(installers).groupBy(installers.trade);

  console.log('\n=== Installers by Trade ===');
  result.forEach(row => {
    console.log(`${row.trade}: ${row.count}`);
  });

  // Query all doors installers with details
  const doorsInstallers = await db.select().from(installers).where(sql`trade = 'doors'`);
  console.log('\n=== All Doors Installers ===');
  doorsInstallers.forEach(installer => {
    console.log(`${installer.firstName} ${installer.lastName} (ID: ${installer.installerId}, Active: ${installer.isActive})`);
  });

  // Query all installers
  const allInstallers = await db.select().from(installers);
  console.log(`\n=== Total Installers: ${allInstallers.length} ===`);

  await client.end();
})();
