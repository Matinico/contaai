import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'No autorizado' });

  // GET /api/entidades?cuit=20123456789
  if (req.method === 'GET') {
    const { cuit } = req.query;
    if (!cuit) return res.status(400).json({ error: 'Falta cuit' });

    const { data, error } = await supabase
      .from('entidades')
      .select('*')
      .eq('cuit', cuit)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  // POST /api/entidades  { cuit, nombre, tipo }
  if (req.method === 'POST') {
    const { cuit, nombre, tipo } = req.body;
    if (!cuit || !nombre) return res.status(400).json({ error: 'Faltan campos' });

    const { data, error } = await supabase
      .from('entidades')
      .insert({ cuit, nombre, tipo })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Ya existe — devolver el registro existente
        const { data: existing } = await supabase.from('entidades').select('*').eq('cuit', cuit).single();
        return res.status(200).json({ data: existing });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ data });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
