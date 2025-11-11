import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../lib/database/schema';
import { sql, eq } from 'drizzle-orm';
import 'dotenv/config';

async function seedJobDates() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('📡 Connecting to database...');
  console.log('🔗 Connection string:', databaseUrl.replace(/:[^:]*@/, ':****@'));

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool, { schema });

  try {
    console.log('Starting to populate job dates...');

    // Get all jobs
    const allJobs = await db.select().from(schema.jobs);
    console.log(`Found ${allJobs.length} jobs to update`);

    // Today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update each job with random dates
    for (const job of allJobs) {
      // Random days in the next 3 months (90 days)
      const randomDaysFromNow = Math.floor(Math.random() * 90) + 1;

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() + randomDaysFromNow);

      // End date is either same day or next day (50/50 chance)
      const endDate = new Date(startDate);
      if (Math.random() > 0.5) {
        endDate.setDate(endDate.getDate() + 1);
      }

      // Format dates as YYYY-MM-DD
      const startDateStr = startDate.toISOString().split('T')[0]!;
      const endDateStr = endDate.toISOString().split('T')[0]!;

      await db
        .update(schema.jobs)
        .set({
          startDate: sql`'${sql.raw(startDateStr)}'::date`,
          endDate: sql`'${sql.raw(endDateStr)}'::date`,
        })
        .where(eq(schema.jobs.jobId, job.jobId));

      console.log(`Updated job ${job.jobId}: start=${startDateStr}, end=${endDateStr}`);
    }

    console.log('✅ All job dates populated successfully!');
  } catch (error) {
    console.error('❌ Error seeding job dates:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedJobDates();
