import pino from 'pino';
import '@axiomhq/pino';

const axiomToken = process.env.AXIOM_TOKEN;
const isProduction = process.env.NODE_ENV === 'production';

// Use Axiom only in non-production environments with a token
// In production (Vercel), fall back to standard logging to avoid transport resolution issues
const loggerOptions = axiomToken && !isProduction
  ? {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: '@axiomhq/pino',
        options: {
          token: axiomToken,
          org: process.env.AXIOM_ORG,
          dataset: process.env.AXIOM_DATASET || 'installer-scheduling',
        },
      },
    }
  : {
      level: process.env.LOG_LEVEL || 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    };

export const logger = pino(loggerOptions as Parameters<typeof pino>[0]);
