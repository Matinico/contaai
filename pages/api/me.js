import { supabase } from '../../lib/supabase';
import { verifyAuth } from '../../lib/verify-auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { data } = await supabase
    .from('usuarios_estudio')
    .select('rol, estudio_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return res.status(200).json({ rol: null });
  return res.status(200).json({ rol: data.rol, estudio_id: data.estudio_id });
}
