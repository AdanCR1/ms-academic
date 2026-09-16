import { createClient } from '@supabase/supabase-js';
import type { Env } from '../types';

export const getSupabaseAdmin = (env: Env) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};