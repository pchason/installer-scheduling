import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function clearTables() {
  const client = await pool.connect();
  
  try {
    console.log('Starting table cleanup...\n');
    
    console.log('Deleting from installer_assignments...');
    const assignmentsResult = await client.query('DELETE FROM installer_assignments');
    console.log(`✓ Deleted ${assignmentsResult.rowCount} rows from installer_assignments\n`);
    
    console.log('Deleting from job_schedules...');
    const schedulesResult = await client.query('DELETE FROM job_schedules');
    console.log(`✓ Deleted ${schedulesResult.rowCount} rows from job_schedules\n`);
    
    console.log('✓ All tables cleared successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearTables();
