import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';

function fmt(n) {
  return (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ClientesPage() {
  const { status } = useSession();
  const router     = useRouter();

  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop,  setShowDrop]  = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [facturas,  setFacturas]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [desde,     setDesde]     = useState('');
  const [hasta,     setHasta]     = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDrop(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r    = await fetch(`/api/entidades?q=${encodeURIComponent(query.trim())}`);
        const json = await r.json();
        setResults(json.data ?? []);
        setShowDrop(true);
      } catch (e) { console.error(e); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Cargar facturas al seleccionar entidad o cambiar fechas
  useEffect(() => {
    if (!selected) { setFacturas([]); return; }
    setLoading(true);
    const p = new URLSearchParams({ cuit_entidad: selected.cuit });
    if (desde) p.set('desde', desde);
    if (hasta) p.set('hasta', hasta);
    fetch(`/api/facturas?${p}`)
      .then(r => r.json())
      .then(json => setFacturas(json.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selected, desde, hasta]);

  const selectEntity = (e) => {
    setSelected(e);
    setQuery(e.nombre);
    setShowDrop(false);
  };

  const totalNeto  = facturas.reduce((s, f) => s + (f.neto  || 0), 0);
  const totalIva   = facturas.reduce((s, f) => s + (f.iva   || 0), 0);
  const totalTotal = facturas.reduce((s, f) => s + (f.total || 0), 0);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'monospace', color: '#6b6b8a', fontSize: 14 }}>Cargando…</div>
      </div>
    );
  }

  return (
    <>
      <Head><title>ContaAI — Libro IVA por Entidad</title></Head>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0f; color: #e8e8f0; font-family: 'Syne', sans-serif; min-height: 100vh; }
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #2a2a3d; border-radius: 3px; }
        .row-hover:hover { background: #1a1a26 !important; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b6b8a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>ContaAI</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f0' }}>Libro IVA por Entidad</h1>
          </div>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#12121a', border: '1px solid #2a2a3d', borderRadius: 10, color: '#a0a0c0', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            ← Volver
          </Link>
        </div>

        {/* ── Buscador ── */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#12121a', border: '1px solid #2a2a3d', borderRadius: 12, padding: '12px 16px' }}>
            <span style={{ color: '#6b6b8a', fontSize: 16 }}>🔍</span>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null); }}
              onFocus={() => results.length && setShowDrop(true)}
              placeholder="Buscá por CUIT o nombre de proveedor / cliente…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e8e8f0', fontSize: 14, fontFamily: 'Syne, sans-serif' }}
            />
            {searching && <span style={{ color: '#6b6b8a', fontSize: 12 }}>buscando…</span>}
            {query && <button onClick={() => { setQuery(''); setSelected(null); setResults([]); setShowDrop(false); }} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', fontSize: 14 }}>✕</button>}
          </div>

          {/* Dropdown resultados */}
          {showDrop && results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#12121a', border: '1px solid #2a2a3d', borderRadius: 12, marginTop: 4, zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              {results.map(e => (
                <button key={e.id} onClick={() => selectEntity(e)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid #1a1a26', cursor: 'pointer', textAlign: 'left', color: '#e8e8f0' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.nombre}</div>
                    <div style={{ fontSize: 12, color: '#6b6b8a', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{e.cuit}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#1a3a5c', background: 'rgba(26,58,92,0.2)', border: '1px solid rgba(26,58,92,0.4)', borderRadius: 6, padding: '3px 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {e.tipo || 'entidad'}
                  </div>
                </button>
              ))}
            </div>
          )}
          {showDrop && results.length === 0 && !searching && query.trim() && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#12121a', border: '1px solid #2a2a3d', borderRadius: 12, marginTop: 4, padding: '16px', color: '#6b6b8a', fontSize: 13, zIndex: 50 }}>
              Sin resultados para "{query}"
            </div>
          )}
        </div>

        {/* ── Entidad seleccionada ── */}
        {selected && (
          <>
            {/* Info entidad + filtros */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: '#12121a', border: '1px solid #1a3a5c', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(26,58,92,0.25)', border: '1px solid rgba(26,58,92,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏢</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.nombre}</div>
                <div style={{ fontSize: 12, color: '#6b6b8a', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>CUIT {selected.cuit} · <span style={{ textTransform: 'capitalize' }}>{selected.tipo || 'entidad'}</span></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Desde</div>
                  <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                    style={{ background: '#0a0a0f', border: '1px solid #2a2a3d', borderRadius: 8, padding: '7px 10px', color: '#e8e8f0', fontSize: 13, fontFamily: 'DM Mono, monospace', outline: 'none' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Hasta</div>
                  <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                    style={{ background: '#0a0a0f', border: '1px solid #2a2a3d', borderRadius: 8, padding: '7px 10px', color: '#e8e8f0', fontSize: 13, fontFamily: 'DM Mono, monospace', outline: 'none' }} />
                </div>
                {(desde || hasta) && (
                  <button onClick={() => { setDesde(''); setHasta(''); }}
                    style={{ marginTop: 18, padding: '7px 12px', background: 'transparent', border: '1px solid #2a2a3d', borderRadius: 8, color: '#6b6b8a', fontSize: 12, cursor: 'pointer' }}>
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Tabla */}
            <div style={{ background: '#12121a', border: '1px solid #2a2a3d', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#0f0f18', borderBottom: '1px solid #2a2a3d' }}>
                    {['Fecha', 'Tipo', 'Nro comprobante', 'Concepto', 'Categoría', 'Alíc.', 'Libro', 'Neto', 'IVA', 'Total'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: h === 'Neto' || h === 'IVA' || h === 'Total' ? 'right' : 'left', color: '#6b6b8a', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: '#6b6b8a', fontSize: 13 }}>Cargando…</td></tr>
                  ) : facturas.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#6b6b8a', fontSize: 13 }}>
                      Sin comprobantes para este período
                    </td></tr>
                  ) : facturas.map(f => (
                    <tr key={f.id} className="row-hover" style={{ borderBottom: '1px solid #1a1a26', transition: 'background 0.1s' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', color: '#a0a0c0', whiteSpace: 'nowrap' }}>{f.fecha || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: 'rgba(26,58,92,0.2)', border: '1px solid rgba(26,58,92,0.35)', borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 700, color: '#7ab3d4', fontFamily: 'DM Mono, monospace' }}>{f.tipo}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', color: '#a0a0c0', fontSize: 12 }}>{f.nro || '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#c8c8e0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.concepto || '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#6b6b8a', fontSize: 12 }}>{f.categoria || '—'}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', color: '#6b6b8a', textAlign: 'center' }}>{f.alicuota != null ? `${f.alicuota}%` : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: f.libro === 'ventas' ? '#818cf8' : '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.libro}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: '#e8e8f0' }}>{fmt(f.neto)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: '#a0a0c0' }}>{fmt(f.iva)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'DM Mono, monospace', fontWeight: 600, color: '#e8e8f0' }}>{fmt(f.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Resumen */}
              {!loading && facturas.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#0f0f18', borderTop: '2px solid #1a3a5c', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ fontSize: 13, color: '#6b6b8a', fontWeight: 600 }}>
                    {facturas.length} comprobante{facturas.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Neto gravado</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 15, marginTop: 2, color: '#e8e8f0' }}>${fmt(totalNeto)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>IVA</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 15, marginTop: 2, color: '#a0a0c0' }}>${fmt(totalIva)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 16, marginTop: 2, color: '#7ab3d4' }}>${fmt(totalTotal)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Estado inicial */}
        {!selected && !query && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b6b8a' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Buscá una entidad para ver su Libro IVA</div>
            <div style={{ fontSize: 13 }}>Ingresá un nombre o CUIT en el campo de búsqueda</div>
          </div>
        )}

      </div>
    </>
  );
}
