import { verifyAuth } from '../../../lib/verify-auth';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.query;

  // ── DELETE /api/facturas/:id ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
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

  return res.status(405).json({ error: 'Método no permitido' });
}
