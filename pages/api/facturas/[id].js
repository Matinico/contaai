import { verifyAuth } from '../../../lib/verify-auth';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.query;

  // ── DELETE /api/facturas/:id ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    // Check user's role; operadores can only delete their own entries
    const { data: membership } = await supabase
      .from('usuarios_estudio')
      .select('rol')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership?.rol === 'operador') {
      const { data: factura } = await supabase
        .from('facturas')
        .select('uploaded_by')
        .eq('id', id)
        .maybeSingle();

      if (factura && factura.uploaded_by && factura.uploaded_by !== user.id) {
        return res.status(403).json({ error: 'No podés eliminar comprobantes cargados por otros usuarios.' });
      }
    }

    const { error } = await supabase
      .from('facturas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase DELETE error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  // ── PATCH /api/facturas/:id ─────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { data: membership } = await supabase
      .from('usuarios_estudio')
      .select('rol')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership?.rol === 'operador') {
      const { data: factura } = await supabase
        .from('facturas')
        .select('uploaded_by')
        .eq('id', id)
        .maybeSingle();
      if (factura && factura.uploaded_by && factura.uploaded_by !== user.id) {
        return res.status(403).json({ error: 'No podés editar comprobantes cargados por otros usuarios.' });
      }
    }

    const body = req.body ?? {};
    const { data, error } = await supabase
      .from('facturas')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
