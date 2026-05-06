import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('SUPABASE: faltan variables de entorno', {
    url: !!url,
    serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey:    !!process.env.SUPABASE_ANON_KEY,
  });
}

export const supabase = createClient(url, key, { auth: { persistSession: false } });
