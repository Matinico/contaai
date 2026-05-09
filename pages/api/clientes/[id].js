import { supabase } from '../../../lib/supabase';
import { verifyAuth } from '../../../lib/verify-auth';

export default async function handler(req, res) {
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('clientes_estudio')
      .select('id, nombre, descripcion, created_at, empresas(id, cuit, nombre_empresa, actividad, direccion, provincia, localidad, created_at)')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
