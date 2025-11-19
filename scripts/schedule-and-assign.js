#!/usr/bin/env node

/**
 * Script to trigger job scheduling and installer assignment
 * POSTs to /api/schedule-jobs-assign-installers
 *
 * Usage: node scripts/schedule-and-assign.js
 */

const API_URL = 'http://localhost:3000/api/schedule-jobs-assign-installers';

async function main() {
  console.log('🚀 Triggering job scheduling and installer assignment...\n');

  try {
    console.log(`📡 POST ${API_URL}`);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', data.error || 'Unknown error');
      console.error('Details:', data.details || '');
      process.exit(1);
    }

    console.log('✅ Success!\n');
    console.log('📋 Response:');
    console.log(JSON.stringify(data, null, 2));

    // Parse and display summary
    if (data.schedulingResult) {
      console.log('\n📅 Scheduling Result:');
      console.log(JSON.stringify(data.schedulingResult, null, 2));
    }

    if (data.assignmentResult) {
      console.log('\n👷 Assignment Result:');
      if (data.assignmentResult.assignments) {
        const successful = data.assignmentResult.assignments.filter(a => a.status === 'assigned');
        const failed = data.assignmentResult.assignments.filter(a => a.status === 'failed');

        console.log(`   ✓ Successful: ${successful.length}`);
        console.log(`   ✗ Failed: ${failed.length}`);

        if (successful.length > 0) {
          console.log('\n   Successful Assignments:');
          successful.slice(0, 5).forEach(a => {
            console.log(`   - ${a.jobNumber} (${a.trade}): ${a.installerName}`);
          });
          if (successful.length > 5) {
            console.log(`   ... and ${successful.length - 5} more`);
          }
        }

        if (failed.length > 0) {
          console.log('\n   Failed Assignments:');
          failed.slice(0, 5).forEach(a => {
            console.log(`   - ${a.jobNumber} (${a.trade}): ${a.reason}`);
          });
          if (failed.length > 5) {
            console.log(`   ... and ${failed.length - 5} more`);
          }
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
