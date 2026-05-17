import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { email, password, name } = req.body || {};

  if (!email?.trim())    return res.status(400).json({ error: 'El email es obligatorio.' });
  if (!password)         return res.status(400).json({ error: 'La contraseña es obligatoria.' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  const { data, error } = await supabase.auth.admin.createUser({
    email:         email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: name?.trim() ? { name: name.trim() } : {},
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
      return res.status(409).json({ error: 'Este email ya está registrado.' });
    }
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ ok: true, userId: data.user?.id });
}
