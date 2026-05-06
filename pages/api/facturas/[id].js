import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.query;
  const userId = session.user.id;

  // ── DELETE /api/facturas/:id ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('facturas')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // garantiza que solo borra registros propios

    if (error) {
      console.error('Supabase DELETE error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
