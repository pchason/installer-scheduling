require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Clearing installer_assignments table...');
    await pool.query('DELETE FROM installer_assignments');
    console.log('✓ installer_assignments cleared');

    console.log('Clearing job_schedules table...');
    await pool.query('DELETE FROM job_schedules');
    console.log('✓ job_schedules cleared');

    console.log('Resetting job status to default value...');
    await pool.query("UPDATE jobs SET status = 'pending'");
    console.log('✓ job status reset to pending');

    console.log('\n✓ All cleared successfully!');
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
