import { supabase } from '../../../lib/supabase';
import { verifyAuth } from '../../../lib/verify-auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { token, nombre, password } = req.body;
  if (!token) return res.status(400).json({ error: 'Token requerido.' });

  // Fetch and validate invitation
  const { data: inv, error: invErr } = await supabase
    .from('invitaciones')
    .select('id, email, usado, estudio_id')
    .eq('token', token)
    .maybeSingle();

  if (invErr || !inv) return res.status(404).json({ error: 'Invitación no encontrada.' });
  if (inv.usado)      return res.status(410).json({ error: 'Esta invitación ya fue usada.' });

  // ── Case A: authenticated user (already has account) ─────────────────────
  const existingUser = await verifyAuth(req);
  if (existingUser) {
    // Check not already a member
    const { data: already } = await supabase
      .from('usuarios_estudio')
      .select('id')
      .eq('user_id', existingUser.id)
      .eq('estudio_id', inv.estudio_id)
      .maybeSingle();

    if (!already) {
      const { error: memberErr } = await supabase
        .from('usuarios_estudio')
        .insert({
          user_id:    existingUser.id,
          estudio_id: inv.estudio_id,
          rol:        'operador',
          nombre:     existingUser.user_metadata?.name || nombre?.trim() || null,
        });
      if (memberErr) return res.status(500).json({ error: memberErr.message });
    }

    await supabase.from('invitaciones').update({ usado: true }).eq('id', inv.id);
    return res.status(200).json({ ok: true });
  }

  // ── Case B: new user (no account yet) ────────────────────────────────────
  if (!password?.trim()) return res.status(400).json({ error: 'La contraseña es obligatoria.' });
  if (!nombre?.trim())   return res.status(400).json({ error: 'El nombre es obligatorio.' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  // Create Supabase auth user with email_confirm: true (invitation = email verified)
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email:          inv.email,
    password,
    email_confirm:  true,
    user_metadata:  { name: nombre.trim() },
  });

  if (createErr) {
    // If user already exists (duplicate email), return specific error
    if (createErr.message?.toLowerCase().includes('already')) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email. Iniciá sesión para aceptar la invitación.' });
    }
    return res.status(500).json({ error: createErr.message });
  }

  // Create membership
  const { error: memberErr } = await supabase
    .from('usuarios_estudio')
    .insert({
      user_id:    newUser.user.id,
      estudio_id: inv.estudio_id,
      rol:        'operador',
      nombre:     nombre.trim(),
    });

  if (memberErr) {
    // Rollback: delete created user
    await supabase.auth.admin.deleteUser(newUser.user.id);
    return res.status(500).json({ error: memberErr.message });
  }

  await supabase.from('invitaciones').update({ usado: true }).eq('id', inv.id);
  return res.status(201).json({ ok: true });
}
