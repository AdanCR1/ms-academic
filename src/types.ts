import type { Context } from 'hono';

export type UserRole = 'superadmin' | 'revisor' | 'investigador' | 'auxiliar';
export type ReportStatus = 'borrador' | 'enviado' | 'en_revision' | 'observado' | 'aprobado' | 'rechazado';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SIGNING_KEY: string;
  INTERNAL_SERVICE_SECRET: string;
  MS_AUTH_URL: string;
  MS_REVIEWS_URL: string;
}

export interface Variables {
  user: {
    id: string;
    email: string;
    rol: UserRole;
  };
}

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;