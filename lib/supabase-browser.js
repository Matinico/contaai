import { createClient } from '@supabase/supabase-js';

// NEXT_PUBLIC_ vars se usan en el browser (una vez configuradas en Vercel).
// En el build/SSR se cae a las vars de servidor que ya están configuradas.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);
