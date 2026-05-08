import { supabase } from '../../lib/supabase';
import { verifyAuth } from '../../lib/verify-auth';

const APP_URL = 'https://contaai-seven.vercel.app';

export default async function handler(req, res) {

  // ── GET ?token=XXX — public, no auth required ────────────────────────────
  if (req.method === 'GET') {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token requerido.' });

    const { data: inv, error } = await supabase
      .from('invitaciones')
      .select('id, email, usado, estudio_id, estudios(nombre)')
      .eq('token', token)
      .maybeSingle();

    if (error || !inv) return res.status(404).json({ error: 'Invitación no encontrada.' });
    if (inv.usado)     return res.status(410).json({ error: 'Esta invitación ya fue usada.' });

    return res.status(200).json({
      email:          inv.email,
      estudio_nombre: inv.estudios?.nombre || '',
      estudio_id:     inv.estudio_id,
    });
  }

  // ── POST — create invitation (admin only) ────────────────────────────────
  if (req.method === 'POST') {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const { data: membership } = await supabase
      .from('usuarios_estudio')
      .select('rol, estudio_id, estudios(nombre)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership)                 return res.status(404).json({ error: 'No pertenecés a ningún estudio.' });
    if (membership.rol !== 'admin')  return res.status(403).json({ error: 'Solo el admin puede invitar.' });

    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'El email es obligatorio.' });

    // Reuse active invitation if one already exists for this email+estudio
    const { data: existing } = await supabase
      .from('invitaciones')
      .select('id, token')
      .eq('estudio_id', membership.estudio_id)
      .eq('email', email.toLowerCase().trim())
      .eq('usado', false)
      .maybeSingle();

    let token;
    if (existing) {
      token = existing.token;
    } else {
      const { data: inv, error: invErr } = await supabase
        .from('invitaciones')
        .insert({ estudio_id: membership.estudio_id, email: email.toLowerCase().trim() })
        .select()
        .single();

      if (invErr) return res.status(500).json({ error: invErr.message });
      token = inv.token;
    }

    const link = `${APP_URL}/invitacion?token=${token}`;
    return res.status(201).json({ ok: true, link });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
