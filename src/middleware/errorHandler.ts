import type { Next } from 'hono';
import type { HonoContext } from '../types/hono';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function errorHandler(
  c: HonoContext,
  next: Next
): Promise<Response | void> {
  try {
    await next();
  } catch (err) {
    logger.error(err, 'Unhandled error');

    if (err instanceof AppError) {
      return c.json(
        {
          error: err.message,
          code: err.code,
        },
        err.statusCode as 200
      );
    }

    if (err instanceof Error) {
      return c.json(
        {
          error: err.message || 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        500 as 200
      );
    }

    return c.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      500 as 200
    );
  }
}
