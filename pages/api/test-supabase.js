import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url     = process.env.SUPABASE_URL;
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  const envReport = {
    SUPABASE_URL:              url     ? `${url.slice(0, 30)}...` : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: svcKey  ? `${svcKey.slice(0, 20)}...` : 'MISSING',
    SUPABASE_ANON_KEY:         anonKey ? `${anonKey.slice(0, 20)}...` : 'MISSING',
  };

  if (!url || (!svcKey && !anonKey)) {
    return res.status(500).json({ ok: false, envReport, error: 'Faltan variables de entorno' });
  }

  // Usar service role key si existe, si no anon key
  const key    = svcKey || anonKey;
  const client = createClient(url, key, { auth: { persistSession: false } });

  // 1. Probar SELECT
  const { data: rows, error: selErr } = await client
    .from('facturas')
    .select('id, periodo, libro')
    .limit(3);

  // 2. Probar INSERT con fila hardcodeada
  const testRow = {
    fecha: '2026-05-06', tipo: 'B', nro: 'TEST-0001',
    proveedor: 'Test Proveedor SA', cuit: '20123456789',
    concepto: 'Prueba de conexión', categoria: 'otros',
    alicuota: 21, neto: 100, iva: 21, total: 121,
    periodo: '05/2026', libro: 'compras',
  };

  const { data: inserted, error: insErr } = await client
    .from('facturas')
    .insert(testRow)
    .select()
    .single();

  // 3. Si insertó, borrarlo para no ensuciar la tabla
  if (inserted?.id) {
    await client.from('facturas').delete().eq('id', inserted.id);
  }

  return res.status(200).json({
    ok: !selErr && !insErr,
    envReport,
    select: { ok: !selErr, rows, error: selErr?.message ?? null },
    insert: { ok: !insErr, id: inserted?.id ?? null, error: insErr?.message ?? null },
    keyUsed: svcKey ? 'SERVICE_ROLE' : 'ANON',
  });
}
