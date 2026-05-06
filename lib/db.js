import { supabase } from './supabase';

export async function findUserByEmail(email) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  return data ?? null;
}

export async function createUser(email, hashedPassword, name = '') {
  const { data, error } = await supabase
    .from('users')
    .insert({ email: email.toLowerCase().trim(), password: hashedPassword, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}
