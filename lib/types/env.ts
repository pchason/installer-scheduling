export interface Env {
  DATABASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  OPENAI_API_KEY: string;
  PORT: string;
  NODE_ENV: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
}
