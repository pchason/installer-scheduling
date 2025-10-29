import type { Context } from 'hono';

export interface HonoEnv {
  Variables: {
    userId?: string;
    user?: {
      id: string;
      email: string;
      role: string;
    };
  };
  Bindings: {
    DATABASE_URL: string;
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    OPENAI_API_KEY: string;
    PORT: string;
    NODE_ENV: string;
  };
}

export type HonoContext = Context<HonoEnv>;
