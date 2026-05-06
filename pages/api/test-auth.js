import { findUserByEmail } from '../../lib/db';
import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  const report = {};

  // 1. Verificar variables de entorno
  report.env = {
    NEXTAUTH_SECRET:   !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL:      process.env.NEXTAUTH_URL || '(not set)',
    SUPABASE_URL:      !!process.env.SUPABASE_URL,
    SUPABASE_SVC_KEY:  !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  // 2. Verificar que la tabla users existe y se puede consultar
  try {
    const user = await findUserByEmail('test@test.com');
    report.findUser = { ok: true, result: user };
  } catch (err) {
    report.findUser = { ok: false, error: err.message };
  }

  // 3. Contar usuarios en la tabla
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    report.usersCount = error ? { error: error.message } : { count };
  } catch (err) {
    report.usersCount = { error: err.message };
  }

  return res.status(200).json(report);
}
