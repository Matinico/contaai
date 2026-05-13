import { verifyAuth } from '../../../lib/verify-auth';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  if (req.method === 'GET') {
    const { cuit, q } = req.query;

    // ── Búsqueda por texto: GET /api/entidades?q=nombre_o_cuit ──────────────
    if (q !== undefined) {
      const term = q.trim();

      if (!term) {
        // Sin término → devolver todas (hasta 50)
        const { data, error } = await supabase
          .from('entidades').select('*').order('nombre').limit(50);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ data });
      }

      // Normalizar: quitar guiones, puntos y espacios para comparar CUITs
      const norm = term.replace(/[-.\s]/g, '');

      // Tres queries paralelas: por nombre, por cuit tal cual, por cuit normalizado
      const [rNombre, rCuit, rCuitNorm] = await Promise.all([
        supabase.from('entidades').select('*').ilike('nombre', `%${term}%`).limit(20),
        supabase.from('entidades').select('*').ilike('cuit',   `%${term}%`).limit(20),
        norm !== term
          ? supabase.from('entidades').select('*').ilike('cuit', `%${norm}%`).limit(20)
          : Promise.resolve({ data: [] }),
      ]);

      // Loguear errores si los hay
      if (rNombre.error) console.error('[entidades search] nombre error:', rNombre.error);
      if (rCuit.error)   console.error('[entidades search] cuit error:',   rCuit.error);

      // Merge y deduplicar por id
      const seen = new Set();
      const merged = [
        ...(rNombre.data ?? []),
        ...(rCuit.data   ?? []),
        ...(rCuitNorm.data ?? []),
      ].filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      }).slice(0, 20);

      return res.status(200).json({ data: merged });
    }

    // ── Búsqueda exacta por CUIT: GET /api/entidades?cuit=xxx ──────────────
    if (cuit) {
      const norm = cuit.replace(/[-.\s]/g, '');

      // Buscar primero con CUIT normalizado (sin guiones/puntos)
      const { data: d1, error: e1 } = await supabase
        .from('entidades').select('*').eq('cuit', norm).maybeSingle();
      if (e1) return res.status(500).json({ error: e1.message });
      if (d1) return res.status(200).json({ data: d1 });

      // Fallback: buscar con el valor original (registros legacy con guiones)
      if (norm !== cuit) {
        const { data: d2 } = await supabase
          .from('entidades').select('*').eq('cuit', cuit).maybeSingle();
        return res.status(200).json({ data: d2 ?? null });
      }

      return res.status(200).json({ data: null });
    }

    return res.status(400).json({ error: 'Falta cuit o q' });
  }

  // ── POST /api/entidades ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { cuit, nombre, tipo } = req.body;
    const normalizedCuit = (cuit || '').replace(/[-.\s]/g, '');
    if (!normalizedCuit || !nombre) return res.status(400).json({ error: 'Faltan campos' });

    const { data, error } = await supabase
      .from('entidades').insert({ cuit: normalizedCuit, nombre, tipo }).select().single();

    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('entidades').select('*').eq('cuit', normalizedCuit).maybeSingle();
        return res.status(200).json({ data: existing });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ data });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
