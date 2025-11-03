import pino from 'pino';

const axiomToken = process.env.AXIOM_TOKEN;

// Always use Axiom if token is provided, otherwise fall back to standard logging
const loggerOptions = axiomToken
  ? {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: '@axiomhq/pino',
        options: {
          token: axiomToken,
          org: process.env.AXIOM_ORG,
          dataset: process.env.AXIOM_DATASET || 'inst aller-scheduling',
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
