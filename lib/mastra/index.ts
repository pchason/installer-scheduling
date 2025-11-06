import { Mastra } from '@mastra/core';
import { schedulingAgent, chatAgent } from './agents';
import { PostgresStore } from "@mastra/pg";
import { PinoLogger } from '@mastra/loggers';
import { HttpTransport } from '@mastra/loggers/http';
import type { LogLevel } from '@mastra/core/logger';

export const mastra = new Mastra({
  agents: { schedulingAgent, chatAgent },
  storage: new PostgresStore({
    connectionString: process.env.DATABASE_URL,
  }),
  logger: new PinoLogger({
    name: 'mastra',
    level: process.env.LOG_LEVEL as LogLevel || 'info',
    transports: { http: new HttpTransport({ 
      url: `https://api.axiom.co/v1/datasets/${process.env.AXIOM_DATASET}/ingest`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AXIOM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      retryOptions: { maxRetries: 5, exponentialBackoff: true },
    })},
  }),
});
