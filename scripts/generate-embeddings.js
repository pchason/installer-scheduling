/**
 * Standalone Script: Generate and Store Schema Embeddings
 *
 * This script generates embeddings for the database schema and stores them in PostgreSQL.
 * Run with: node scripts/generate-embeddings.js
 */

require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const { InferenceClient } = require('@huggingface/inference');

// Schema descriptions
const schemaDescriptions = [
  'Table: installers - Stores information about installation workers including their trade specialty',
  'installers.installer_id (serial, PRIMARY KEY) - Unique identifier for the installer',
  'installers.first_name (varchar) - Installer first name',
  'installers.last_name (varchar) - Installer last name',
  'installers.trade (enum: trim, stairs, doors) - Type of installation work the installer specializes in',
  'installers.phone (varchar) - Contact phone number',
  'installers.email (varchar) - Contact email address',
  'installers.is_active (boolean) - Whether the installer is currently active',

  'Table: geographic_locations - Represents geographic service areas where installers can perform their work and jobs exist',
  'geographic_locations.location_id (serial, PRIMARY KEY) - Unique identifier for the location',
  'geographic_locations.location_name (varchar) - Name of the geographic location',
  'geographic_locations.zip_code (varchar) - Zip code for the location',
  'geographic_locations.city (varchar) - City name',
  'geographic_locations.state (varchar) - State abbreviation (2 characters)',

  'Table: installer_locations - Junction table linking installers to geographic locations they serve',
  'installer_locations.installer_id (integer, FOREIGN KEY) - References `installers.installer_id`',
  'installer_locations.location_id (integer, FOREIGN KEY) - References `geographic_locations.location_id`',

  'Table: jobs - Represents scheduled jobs that need to be completed by installers who will be or are already assigned',
  'jobs.job_id (serial, PRIMARY KEY) - Unique identifier for the job',
  'jobs.job_number (varchar) - Human-readable job number',
  'jobs.street_address (varchar) - Street address of the job',
  'jobs.city (varchar) - City where the job is located',
  'jobs.state (varchar) - State where the job is located',
  'jobs.zip_code (varchar) - Zip code of the job location',
  'jobs.location_id (integer, FOREIGN KEY) - References `geographic_locations.location_id`',
  'jobs.status (enum: pending, scheduled, in_progress, completed, cancelled) - Current status of the job',
  'jobs.start_date (date) - Planned start date for the job',
  'jobs.end_date (date) - Planned end date for the job',

  'Table: purchase_orders - Detailed requirements for trim, stair, and door installation work on a job',
  'purchase_orders.po_id (serial, PRIMARY KEY) - Unique identifier for the purchase order',
  'purchase_orders.job_id (integer, FOREIGN KEY) - References `jobs.job_id`',
  'purchase_orders.po_number (varchar) - Human-readable PO number',
  'purchase_orders.trim_linear_feet (decimal) - Linear feet of trim work required',
  'purchase_orders.stair_risers (integer) - Number of stair risers to install',
  'purchase_orders.door_count (integer) - Number of doors to install',
  'purchase_orders.status (enum: pending, scheduled, completed, cancelled) - Status of the PO',

  'Table: job_schedules - The scheduled start dates for jobs',
  'job_schedules.schedule_id (serial, PRIMARY KEY) - Unique identifier for a job that has been scheduled',
  'job_schedules.job_id (integer, FOREIGN KEY) - References `jobs.job_id`. Links a scheduled job to its details in the jobs table.',
  'job_schedules.scheduled_date (date) - The scheduled date for the job',
  'job_schedules.status (enum: scheduled, completed, cancelled) - Status of the schedule',

  'Table: installer_assignments - Assignments of installers to specific jobs based on an installer\'s trade specialty',
  'installer_assignments.assignment_id (serial, PRIMARY KEY) - Unique identifier for the assignment',
  'installer_assignments.schedule_id (integer, FOREIGN KEY) - References `job_schedules.schedule_id`',
  'installer_assignments.installer_id (integer, FOREIGN KEY) - References `installers.installer_id`',
  'installer_assignments.po_id (integer, FOREIGN KEY) - References `purchase_orders.po_id`',
  'installer_assignments.assignment_status (enum: assigned, completed, cancelled) - Status of the assignment',

  'Relationship: Jobs are located in geographic_locations by city name and location_id',
  'Relationship: Installers are assigned to geographic_locations of scheduled jobs based on installer_locations',
  'Relationship: purchase_orders define trade work requirements for jobs',
  'Relationship: job_schedules define when jobs start and verify that they are scheduled',
  'Relationship: installer_assignments link installers to scheduled jobs',

  'Enum: trade - Installation trade types: trim, stairs, doors',
  'Enum: jobStatus - Job status values: pending, scheduled, in_progress, completed, cancelled',
  'Enum: poStatus - Purchase order status: pending, scheduled, completed, cancelled',
  'Enum: assignmentStatus - Assignment status: assigned, completed, cancelled',
];

async function generateEmbeddings() {
  console.log('🚀 Starting schema embedding generation...');

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  if (!process.env.HF_API_TOKEN) {
    console.error('Error: HF_API_TOKEN environment variable is not set');
    console.error('Get your token at: https://huggingface.co/settings/tokens');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log(`Generated ${schemaDescriptions.length} schema descriptions`);

    // Categorize descriptions
    const records = [];

    schemaDescriptions.forEach((desc, index) => {
      let category = 'table';
      let schemaKey = '';

      if (desc.startsWith('Table:')) {
        category = 'table';
        schemaKey = desc.match(/Table: (\w+)/)?.[1] || desc;
      } else if (desc.startsWith('Relationship:')) {
        category = 'relationship';
        schemaKey = `relationship_${index}`;
      } else if (desc.startsWith('Enum:')) {
        category = 'enum';
        schemaKey = desc.match(/Enum: (\w+)/)?.[1] || desc;
      } else if (desc.includes('(') && desc.includes(')')) {
        category = 'field';
        const match = desc.match(/(\w+\.\w+)/);
        schemaKey = match?.[1] || desc;
      }

      records.push({
        schemaKey,
        description: desc,
        category,
        metadata: {},
      });
    });

    console.log(`Categorized descriptions into:`);
    console.log(`  - Tables: ${records.filter((r) => r.category === 'table').length}`);
    console.log(`  - Fields: ${records.filter((r) => r.category === 'field').length}`);
    console.log(`  - Relationships: ${records.filter((r) => r.category === 'relationship').length}`);
    console.log(`  - Enums: ${records.filter((r) => r.category === 'enum').length}`);

    // Generate embeddings using Hugging Face Inference API
    console.log('\n📡 Generating embeddings with Hugging Face...');
    const hf = new InferenceClient(process.env.HF_API_TOKEN);

    const embeddingsData = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const embedding = await hf.featureExtraction({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: record.description,
        });

        embeddingsData.push({
          ...record,
          embedding,
        });

        if ((i + 1) % 10 === 0) {
          console.log(`  Processed ${i + 1}/${records.length} descriptions`);
        }
      } catch (error) {
        console.error(`Error embedding description for ${record.schemaKey}:`, error.message);
      }
    }

    console.log(`✅ Generated ${embeddingsData.length} embeddings`);

    // Clear existing embeddings
    console.log('\n🗑️ Clearing existing embeddings...');
    await pool.query('DELETE FROM schema_embeddings');

    // Store embeddings in database
    console.log('💾 Storing embeddings in database...');
    for (const embeddingData of embeddingsData) {
      await pool.query(
        `INSERT INTO schema_embeddings (schema_key, description, embedding, category, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          embeddingData.schemaKey,
          embeddingData.description,
          JSON.stringify(embeddingData.embedding),
          embeddingData.category,
          JSON.stringify(embeddingData.metadata || {}),
        ]
      );
    }

    console.log(`✅ Successfully stored ${embeddingsData.length} embeddings in the database`);
    console.log('\n🎉 Schema embedding generation complete!');
    await pool.end();
  } catch (error) {
    console.error('❌ Error during embedding generation:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// Run the function
generateEmbeddings();
