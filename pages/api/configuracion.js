import { supabase } from '../../lib/supabase';
import { verifyAuth } from '../../lib/verify-auth';

export default async function handler(req, res) {
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  // Get the user's membership record
  const { data: membership, error: memErr } = await supabase
    .from('usuarios_estudio')
    .select('id, rol, estudio_id, estudios(id, nombre, cuit)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (memErr || !membership)
    return res.status(404).json({ error: 'No pertenecés a ningún estudio.' });

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    // Fetch all members of the estudio
    const { data: miembros } = await supabase
      .from('usuarios_estudio')
      .select('id, user_id, rol, nombre, created_at')
      .eq('estudio_id', membership.estudio_id)
      .order('created_at', { ascending: true });

    // Fetch emails from auth.users via admin API
    let emailMap = {};
    try {
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      emailMap = Object.fromEntries(users.map(u => [u.id, u.email]));
    } catch (_) {}

    const miembrosConEmail = (miembros || []).map(m => ({
      ...m,
      email: emailMap[m.user_id] || null,
    }));

    return res.status(200).json({
      estudio: membership.estudios,
      rol:     membership.rol,
      miembros: miembrosConEmail,
    });
  }

  // ── PUT — update estudio (admin only) ────────────────────────────────────
  if (req.method === 'PUT') {
    if (membership.rol !== 'admin')
      return res.status(403).json({ error: 'Solo el admin puede editar el estudio.' });

    const { nombre, cuit } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio.' });
    if (!cuit?.trim())   return res.status(400).json({ error: 'El CUIT es obligatorio.' });

    const { data, error } = await supabase
      .from('estudios')
      .update({ nombre: nombre.trim(), cuit: cuit.trim() })
      .eq('id', membership.estudio_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
