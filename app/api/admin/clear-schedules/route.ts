import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { installerAssignments, jobSchedules } from '@/lib/database/schema';

export async function POST(request: NextRequest) {
  try {
    console.log('Clearing tables...');

    // Delete from child table first (installer_assignments)
    const assignmentResult = await db.delete(installerAssignments);
    console.log('Cleared installer_assignments');

    // Then delete from parent table (job_schedules)
    const scheduleResult = await db.delete(jobSchedules);
    console.log('Cleared job_schedules');

    return NextResponse.json({
      success: true,
      message: 'Tables cleared successfully',
      deleted: {
        installerAssignments: 'all records',
        jobSchedules: 'all records',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error clearing tables:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear tables',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
