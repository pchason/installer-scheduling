# Autonomous Scheduling System

This document explains how the autonomous scheduling system works.

## Overview

When a new job is created in the system, an AI-powered scheduling agent automatically analyzes the job requirements and schedules appropriate installers based on:

- Trade type requirements (trim, stairs, doors) from purchase orders
- Installer availability for requested dates
- Geographic location coverage
- Installer specialization

## How It Works

### 1. Job Creation Triggers Agent

When you create a job via `POST /api/jobs`:

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d {
    "jobNumber": "JOB-001",
    "streetAddress": "123 Main St",
    "city": "Portland",
    "state": "OR",
    "zipCode": "97214",
    "locationId": 1
  }
```

The system automatically:
1. Creates the job in the database
2. Calls the job creation webhook
3. Triggers the Mastra scheduling agent

### 2. Agent Analysis

The agent receives the job ID and performs these steps:

1. **Retrieves Job Details**: Fetches the job and all associated purchase orders
2. **Analyzes Requirements**: Determines what trades are needed:
   - If PO has `trim_linear_feet > 0` → needs trim installer
   - If PO has `stair_risers > 0` → needs stairs installer
   - If PO has `door_count > 0` → needs doors installer
3. **Searches Installers**: For each trade needed, finds available installers
4. **Creates Schedules**: Creates job schedule entries for appropriate dates
5. **Assigns Installers**: Creates installer assignments linking installers to schedules

### 3. Agent Tools

The agent has access to these tools:

- **get_job_with_pos**: Retrieve job and purchase orders
- **find_available_installers**: Find installers by trade and date
- **create_job_schedule**: Create a schedule for a specific date
- **assign_installer**: Assign an installer to a job
- **get_installer_details**: Get installer information
- **check_installer_location_coverage**: Verify installer serves location

## Configuration

### Environment Variables Required

```env
OPENAI_API_KEY=sk-...  # For LLM access
DATABASE_URL=postgresql://...
```

### Agent Model

The agent uses `gpt-4o-mini` model for decision-making. You can change this in `lib/mastra/agents.ts`:

```typescript
model: 'gpt-4o-mini',  // Change to 'gpt-4', 'claude-3-opus', etc.
```

## Example Flow

### Input: Create a Job

```json
{
  "jobNumber": "TRIM-2024-001",
  "streetAddress": "456 Oak Ave",
  "city": "Portland",
  "state": "OR",
  "zipCode": "97214",
  "locationId": 1
}
```

### Purchase Orders (Pre-existing)

```json
{
  "jobId": 5,
  "poNumber": "PO-001",
  "trimLinearFeet": 150,
  "stairRisers": 0,
  "doorCount": 0
}
```

### Agent Decision

"This job needs trim installation (150 linear feet). Looking for available trim installers in Portland area for tomorrow..."

### Result

- Schedule created for tomorrow
- John Smith (trim installer) assigned to the job
- Assignment shows: Installer #3 → Job #5 → Schedule #1

## Monitoring

Check logs to see what the agent is doing:

```bash
# Watch real-time logs
tail -f logs/app.log | grep "Autonomous scheduling"
```

Log entries include:
- `Triggering autonomous scheduling for new job`
- `Autonomous scheduling completed successfully`
- `Error in job creation webhook`

## Troubleshooting

### Agent didn't schedule anyone

Possible reasons:
1. No installers with the required trade exist
2. All installers are already booked for proposed dates
3. Installers don't serve the job location
4. OpenAI API key is invalid/insufficient quota

Check logs for details on what the agent tried.

### LLM API Errors

If you see "OpenAI API rate limit" errors:
- Wait a minute before retrying
- Check your OpenAI account quota
- Verify API key is valid

## Future Enhancements

- Add notifications to scheduled installers
- Allow custom scheduling rules (e.g., preferred pairs of installers)
- Add cost optimization (schedule cheaper installers first)
- Multi-day job scheduling with installer rotation
- Conflict resolution when no perfect match exists
