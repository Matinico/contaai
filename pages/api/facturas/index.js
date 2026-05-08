import { verifyAuth } from '../../../lib/verify-auth';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  // ── GET /api/facturas ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { periodo, libro, cuit_entidad, desde, hasta, cliente_id } = req.query;

    let query = supabase
      .from('facturas')
      .select('*')
      .order('fecha', { ascending: true });

    if (periodo)      query = query.eq('periodo',      periodo);
    if (libro)        query = query.eq('libro',        libro);
    if (cuit_entidad) query = query.eq('cuit_entidad', cuit_entidad);
    if (desde)        query = query.gte('fecha',       desde);
    if (hasta)        query = query.lte('fecha',       hasta);
    if (cliente_id)   query = query.eq('cliente_id',   cliente_id);

    const { data, error } = await query;
    if (error) {
      console.error('[GET /api/facturas] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ data });
  }

  // ── POST /api/facturas ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body;
    console.log('[POST /api/facturas] body:', JSON.stringify(body));

    const { data, error } = await supabase
      .from('facturas')
      .insert({ ...body, uploaded_by: user.id })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/facturas] Supabase error:', JSON.stringify(error));
      return res.status(500).json({ error: error.message, details: error });
    }
    console.log('[POST /api/facturas] OK, id:', data?.id);
    return res.status(201).json({ data });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
