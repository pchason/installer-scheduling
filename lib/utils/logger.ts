import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

const loggerOptions = isProd
  ? {
      level: process.env.LOG_LEVEL || 'info',
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
