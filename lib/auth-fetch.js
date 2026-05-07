import { supabase } from './supabase-browser';

export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const { 'Content-Type': ct, ...restHeaders } = options.headers || {};

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': ct || 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...restHeaders,
    },
  });
}
