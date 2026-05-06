import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'No autorizado' });

  // ── GET /api/facturas?periodo=05/2026&libro=compras ──────────────────────
  if (req.method === 'GET') {
    const { periodo, libro } = req.query;

    let query = supabase
      .from('facturas')
      .select('*')
      .order('created_at', { ascending: true });

    if (periodo) query = query.eq('periodo', periodo);
    if (libro)   query = query.eq('libro',   libro);

    const { data, error } = await query;
    if (error) {
      console.error('Supabase GET error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ data });
  }

  // ── POST /api/facturas ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body;
    console.log('POST /api/facturas body:', JSON.stringify(body));

    const { data, error } = await supabase
      .from('facturas')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('Supabase POST error:', error);
      return res.status(500).json({ error: error.message });
    }
    console.log('Factura guardada:', data?.id);
    return res.status(201).json({ data });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
