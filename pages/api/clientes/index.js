import { supabase } from '../../../lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'No autorizado' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('clientes_estudio')
      .select('id, nombre, descripcion, created_at, empresas(id, cuit, nombre_empresa)')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const ids = data.map(c => c.id);
    let actividadMap = {};
    if (ids.length > 0) {
      const { data: facturas } = await supabase
        .from('facturas')
        .select('cliente_id, fecha')
        .in('cliente_id', ids)
        .order('fecha', { ascending: false });

      if (facturas) {
        for (const f of facturas) {
          if (!actividadMap[f.cliente_id]) actividadMap[f.cliente_id] = f.fecha;
        }
      }
    }

    const result = data.map(c => ({
      ...c,
      ultima_actividad: actividadMap[c.id] || null,
    }));

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const { nombre, descripcion, empresas } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

    const { data: cliente, error: clienteErr } = await supabase
      .from('clientes_estudio')
      .insert({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null })
      .select()
      .single();

    if (clienteErr) return res.status(500).json({ error: clienteErr.message });

    if (empresas?.length > 0) {
      const valid = empresas.filter(e => e.cuit?.trim() && e.nombre_empresa?.trim());
      if (valid.length > 0) {
        const { error: empErr } = await supabase
          .from('empresas')
          .insert(valid.map(e => ({
            cliente_id: cliente.id,
            cuit: e.cuit.trim(),
            nombre_empresa: e.nombre_empresa.trim(),
          })));
        if (empErr) return res.status(500).json({ error: empErr.message });
      }
    }

    return res.status(201).json(cliente);
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
