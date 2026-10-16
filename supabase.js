import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://demo-placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'demo-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'demo-service-key';

export const isSupabaseConfigured = () => {
  return (
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_URL !== 'https://demo-placeholder.supabase.co' &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== 'demo-service-key'
  );
};

// Standard client for public / scoped queries
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Privileged client with service role key for administrative operations & secure server writes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
