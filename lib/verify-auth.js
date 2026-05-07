import { createClient } from '@supabase/supabase-js';

export async function verifyAuth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
