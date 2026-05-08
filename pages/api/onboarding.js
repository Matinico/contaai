import { supabase } from '../../lib/supabase';
import { verifyAuth } from '../../lib/verify-auth';

export default async function handler(req, res) {
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  // GET — check if onboarding is complete
  if (req.method === 'GET') {
    const { data } = await supabase
      .from('usuarios_estudio')
      .select('id, rol, estudio_id, estudios(id, nombre, cuit)')
      .eq('user_id', user.id)
      .maybeSingle();

    return res.status(200).json({ completed: !!data, record: data || null });
  }

  // POST — complete onboarding: create estudio + usuarios_estudio
  if (req.method === 'POST') {
    const { nombre, telefono, estudio_nombre, estudio_cuit } = req.body;

    if (!estudio_nombre?.trim())
      return res.status(400).json({ error: 'El nombre del estudio es obligatorio.' });
    if (!estudio_cuit?.trim())
      return res.status(400).json({ error: 'El CUIT del estudio es obligatorio.' });

    // Idempotency: if already completed, return existing record
    const { data: existing } = await supabase
      .from('usuarios_estudio')
      .select('id, estudio_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) return res.status(200).json({ ok: true, estudio_id: existing.estudio_id });

    // Create estudio
    const { data: estudio, error: estudioErr } = await supabase
      .from('estudios')
      .insert({ nombre: estudio_nombre.trim(), cuit: estudio_cuit.trim() })
      .select()
      .single();

    if (estudioErr) return res.status(500).json({ error: estudioErr.message });

    // Create usuarios_estudio with admin role
    const { error: memberErr } = await supabase
      .from('usuarios_estudio')
      .insert({
        user_id:    user.id,
        estudio_id: estudio.id,
        rol:        'admin',
        nombre:     nombre?.trim() || null,
      });

    if (memberErr) return res.status(500).json({ error: memberErr.message });

    // Update auth user metadata so user.user_metadata.name reflects the name entered
    if (nombre?.trim()) {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          name:     nombre.trim(),
          telefono: telefono?.trim() || null,
          estudio:  estudio_nombre.trim(),
        },
      });
    }

    return res.status(201).json({ ok: true, estudio_id: estudio.id });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
