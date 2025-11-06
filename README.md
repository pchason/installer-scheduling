# Installer Scheduling System

An AI-powered scheduling system for managing construction trades installers (200+ installers) with conflict prevention, real-time scheduling constraints, and AI-driven chat interface.

## Tech Stack

- **Framework**: NextJS
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **AI**: Mastra AI Framework
- **Chat UI**: CopilotKit
- **Validation**: Zod
- **Logging**: Pino

## Features

- Schedule 200+ installers across multiple locations
- Automatic conflict prevention: No duplicate trade at same location/time
- Real-time installer availability management
- AI-powered chat interface for schedule queries
- RESTful API for schedule management
- Type-safe database operations with Drizzle ORM

## Project Structure

```
app/
├── api/                   # API routes
│   ├── jobs/              # Job management endpoints
│   ├── installers/        # Installer management endpoints
│   ├── purchase-orders/   # Purchase order endpoints
│   ├── chat/              # Chat interface endpoints
│   ├── copilot/           # CopilotKit integration
│   └── schedule-jobs-assign-installers/  # Automated scheduling
├── job/
│   └── create/            # Job creation UI
└── layout.tsx             # Root layout

components/
├── JobCard.tsx            # Job display component
├── InstallerList.tsx      # Installer listing
└── ...                    # Other UI components

lib/
├── database/              # Drizzle schema, migrations, client
├── mastra/                # Mastra AI agents and tools
├── types/                 # TypeScript type definitions
└── utils/                 # Helper utilities

drizzle/
├── migrations/            # Database migrations
└── schema.ts              # Database schema definitions
```

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- PostgreSQL 14+ (or Supabase account)
- npm or pnpm

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and update with your credentials:

```bash
cp .env.example .env
```

Update these variables:
- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon key
- `GROQ_API_KEY` - Groq API key for LLM features
- `AXIOM_TOKEN` - Axiom.co token for logging (optional)

### Database Setup

```bash
# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate

# View database in Drizzle Studio
npm run db:studio
```

### Development

```bash
npm run dev
```

Server starts on `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## Available Commands

From `package.json`:

- `npm run dev` - Start development server (localhost:3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run linter
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio to view/edit database

## API Endpoints

**Jobs**
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create a new job
- `GET /api/jobs/[id]` - Get job details
- `PUT /api/jobs/[id]` - Update job status

**Installers**
- `GET /api/installers` - List all installers
- `POST /api/installers` - Create installer

**Purchase Orders**
- `GET /api/purchase-orders` - List purchase orders
- `POST /api/purchase-orders` - Create purchase order

**Scheduling & Assignment**
- `POST /api/schedule-jobs-assign-installers` - Automated job scheduling and installer assignment

**Chat & AI**
- `POST /api/chat` - Chat with AI agent
- `POST /api/copilot` - CopilotKit integration

**Utilities**
- `GET /api/health` - Health check

## Database Schema

### Core Tables

- **jobs** - Construction job records with location, status, and date range
- **job_schedules** - Scheduled dates for jobs with status tracking
- **installers** - Installer profiles with trade specialization (trim, stairs, doors)
- **installer_locations** - Many-to-many mapping of installers to service locations
- **geographic_locations** - Geographic service areas
- **purchase_orders** - Line items for jobs specifying quantities for each trade
- **installer_assignments** - Installer-to-schedule assignments
- **chat_messages** - Chat conversation history

### Key Features

- **Status Tracking**: Jobs progress from pending → scheduled → in_progress → completed
- **Multi-Installer Support**: Automatically assigns multiple installers per trade when workload exceeds thresholds:
  - Trim: 2 installers if linear feet > 400
  - Stairs: 2 installers if risers > 25
  - Doors: 2 installers if door count > 15
- **Conflict Prevention**: No installer can be assigned to multiple jobs on the same date
- **Location-Based Matching**: Installers are assigned only to jobs within their service areas

## Next Steps

1. Set up Supabase database schema
2. Implement scheduling constraints engine
3. Integrate Mastra AI agents
4. Add CopilotKit chat interface
5. Develop API endpoints

## Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run type-check   # Type check without emitting
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
```

## Development Notes

- All code is TypeScript with strict mode enabled
- Uses ESM modules throughout
- Database operations use Drizzle ORM with type safety
- Hono provides edge-ready API framework
- Error handling standardized with custom AppError classes
