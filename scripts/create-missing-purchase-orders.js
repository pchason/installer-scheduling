#!/usr/bin/env node

/**
 * Script to create purchase orders for jobs that don't have them
 * Reads job IDs from a CSV file and creates 3 POs per job using random trade values
 *
 * Usage: node scripts/create-missing-purchase-orders.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CSV_FILE = path.join(process.env.HOME, 'Downloads', 'Supabase Snippet Jobs Without Purchase Orders.csv');
const API_BASE_URL = 'http://localhost:3000/api/purchase-orders';

// Create 3 purchase orders per job with random trade values
// Following the logic from lib/common/installer-assignment.ts line 70
// and the PO creation pattern in app/api/jobs/route.ts
function generatePurchaseOrders(jobId, jobNumber) {
  return [
    {
      jobId,
      poNumber: `${jobNumber}-PO-001`,
      trimLinearFeet: (Math.random() * 1000).toFixed(2),
      stairRisers: null,
      doorCount: null,
    },
    {
      jobId,
      poNumber: `${jobNumber}-PO-002`,
      trimLinearFeet: null,
      stairRisers: Math.floor(Math.random() * 150) + 1,
      doorCount: null,
    },
    {
      jobId,
      poNumber: `${jobNumber}-PO-003`,
      trimLinearFeet: null,
      stairRisers: null,
      doorCount: Math.floor(Math.random() * 15) + 1,
    },
  ];
}

// Parse CSV line and extract job info
function parseCSVLine(line, headers) {
  const values = line.split(',').map(v => v.trim());
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = values[index];
  });
  return obj;
}

// POST a purchase order to the API
async function createPurchaseOrder(po) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(po),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main execution
async function main() {
  console.log('🔄 Starting purchase order creation process...\n');

  // Check if CSV file exists
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV file not found: ${CSV_FILE}`);
    process.exit(1);
  }

  console.log(`📂 Reading CSV: ${CSV_FILE}\n`);

  let lineCount = 0;
  let jobCount = 0;
  let successCount = 0;
  let failureCount = 0;
  let headers = [];
  const jobs = [];

  // Read and parse CSV file
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineCount++;

    // Skip empty lines
    if (!line || line.trim().length === 0) {
      continue;
    }

    // Parse header (first non-empty line)
    if (lineCount === 1) {
      headers = line.split(',').map(h => h.trim());
      console.log(`✓ Found ${headers.length} columns: ${headers.join(', ')}\n`);
      continue;
    }

    // Parse job row - skip if first field looks like a header
    if (line.trim().startsWith('job_id')) {
      console.log('⚠️  Skipping duplicate header row');
      continue;
    }

    const job = parseCSVLine(line, headers);

    // Validate the job has a numeric job_id
    if (!job.job_id || isNaN(parseInt(job.job_id, 10))) {
      console.warn(`⚠️  Skipping invalid job (invalid job_id): ${line.substring(0, 50)}...`);
      continue;
    }

    jobs.push(job);
  }

  console.log(`📊 Found ${jobs.length} jobs in CSV\n`);

  // Show first 3 jobs as validation
  if (jobs.length > 0) {
    console.log('📋 First 3 jobs for validation:');
    jobs.slice(0, 3).forEach((job, i) => {
      console.log(`   ${i + 1}. Job ID: ${job.job_id}, Number: ${job.job_number}`);
    });
    console.log('');
  }

  console.log('Creating purchase orders...\n');

  // Process each job
  for (const job of jobs) {
    const jobId = parseInt(job.job_id, 10);
    const jobNumber = job.job_number;

    if (!jobId || !jobNumber) {
      console.warn(`⚠️  Skipping invalid job: ${JSON.stringify(job)}`);
      continue;
    }

    jobCount++;
    const pos = generatePurchaseOrders(jobId, jobNumber);

    console.log(`📌 Job ${jobCount}/${jobs.length}: ID=${jobId}, Number=${jobNumber}`);

    // Create each PO
    for (let i = 0; i < pos.length; i++) {
      const po = pos[i];
      const result = await createPurchaseOrder(po);

      if (result.success) {
        successCount++;
        console.log(`   ✓ ${po.poNumber} created (ID: ${result.data.poId})`);
      } else {
        failureCount++;
        console.log(`   ✗ ${po.poNumber} failed: ${result.error}`);
      }
    }

    console.log('');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary');
  console.log('='.repeat(60));
  console.log(`Jobs processed: ${jobCount}`);
  console.log(`Purchase orders created: ${successCount}`);
  console.log(`Purchase orders failed: ${failureCount}`);
  console.log(`Total purchase orders: ${successCount + failureCount}`);
  console.log('='.repeat(60) + '\n');

  if (failureCount > 0) {
    console.warn(`⚠️  ${failureCount} purchase orders failed to create`);
    process.exit(1);
  } else {
    console.log('✅ All purchase orders created successfully!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
