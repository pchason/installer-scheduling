# Installer Scheduling System

An AI-powered scheduling system for managing construction trades installers (200+ installers) with conflict prevention, real-time scheduling constraints, and AI-driven chat interface.

## Tech Stack

- **Framework**: Hono (TypeScript-first, edge-compatible)
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
src/
├── database/          # Drizzle schema, migrations, client
├── api/               # API routes and controllers
├── services/          # Business logic (scheduling, conflicts)
├── agents/            # Mastra AI agents
├── middleware/        # Error handling, auth, etc.
├── utils/             # Logger, errors, helpers
└── types/             # TypeScript type definitions
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
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon key
- `OPENAI_API_KEY` - For AI features

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

## API Endpoints

- `GET /health` - Health check
- `GET /api` - API root
- `POST /api/installers` - Create installer
- `GET /api/installers` - List installers
- `POST /api/bookings` - Create booking (with conflict check)
- `GET /api/locations/:id/bookings` - Get location bookings
- `POST /api/chat` - Chat with AI agent

## Database Schema

### Core Tables

- **installers** - Installer profiles with trade categories
- **locations** - Construction job locations
- **bookings** - Scheduled installer assignments with conflict constraints
- **installer_availability** - Weekly availability windows
- **chat_messages** - Chat conversation history
- **scheduling_rules** - Custom scheduling constraints

### Key Constraint

The system prevents scheduling conflicts through:
1. Database index on `(location_id, trade_type, start_time)`
2. Application-level validation before booking
3. Trade category enforcement: Only one installer per trade type at same location during overlapping times

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
