import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const C = {
  navy:   '#1a3a5c',
  navyLt: '#e8f0f7',
  bg:     '#f0f4f8',
  white:  '#ffffff',
  text:   '#1e293b',
  muted:  '#64748b',
  border: '#e2e8f0',
  red:    '#dc2626',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
};

export default function ClienteDetalle() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const menuRef = useRef(null);

  const [menu, setMenu]       = useState(false);
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => { if (status === 'unauthenticated') router.replace('/login'); }, [status, router]);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetch(`/api/clientes/${id}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) setError(data.error);
          else setCliente(data);
        })
        .catch(() => setError('Error de red'))
        .finally(() => setLoading(false));
    }
  }, [status, id]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font, color: C.muted }}>Cargando…</div>;
  }

  return (
    <>
      <Head><title>{cliente ? `${cliente.nombre} — CIA` : 'Cliente — CIA'}</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};color:${C.text};font-family:${C.font};min-height:100vh;}
        input,select,button{font-family:${C.font};}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* HEADER */}
      <header style={{ background: C.navy, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="2" width="11" height="14" rx="1.5" stroke="white" strokeWidth="1.5"/>
                <path d="M6 7h5M6 10h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="15" cy="14" r="4" fill={C.navy} stroke="white" strokeWidth="1.5"/>
                <path d="M13 14l1.5 1.5L17 12.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: '0.02em' }}>CIA</span>
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16, margin: '0 2px' }}>/</span>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500 }}>
            {loading ? '…' : cliente?.nombre || 'Cliente'}
          </span>
        </div>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, padding: '6px 12px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {(session?.user?.email || 'U')[0].toUpperCase()}
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>

          {menu && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, width: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', animation: 'fadeIn 0.15s ease', zIndex: 100 }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.muted }}>{session?.user?.email}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{session?.user?.name || '—'}</div>
              </div>
              <div style={{ padding: '8px 0' }}>
                <button onClick={() => signOut({ callbackUrl: '/login' })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.red, fontWeight: 600, textAlign: 'left' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 10l3-3-3-3M12 7H5M5 2H2v10h3" stroke={C.red} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* BODY */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 13, textDecoration: 'none', marginBottom: 28, fontWeight: 500 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8 10l-3-3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Volver al dashboard
        </Link>

        {loading ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: '80px 0' }}>Cargando…</div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: C.red, padding: '80px 0' }}>{error}</div>
        ) : cliente ? (
          <>
            {/* Info card */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: cliente.descripcion ? 16 : 0 }}>
                <div style={{ width: 52, height: 52, background: C.navyLt, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: C.navy, flexShrink: 0 }}>
                  {cliente.nombre[0].toUpperCase()}
                </div>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{cliente.nombre}</h1>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                    Cliente desde {new Date(cliente.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
              {cliente.descripcion && (
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, paddingLeft: 68 }}>{cliente.descripcion}</p>
              )}
            </div>

            {/* Empresas */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Empresas</h2>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {cliente.empresas?.length || 0} empresa{(cliente.empresas?.length || 0) !== 1 ? 's' : ''} asociada{(cliente.empresas?.length || 0) !== 1 ? 's' : ''}
                </div>
              </div>
              {!cliente.empresas?.length ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
                  Este cliente no tiene empresas asociadas todavía.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['CUIT', 'Razón social', 'Alta'].map(h => (
                          <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cliente.empresas.map(e => (
                        <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '13px 20px', fontFamily: 'monospace', color: C.muted, fontSize: 12 }}>{e.cuit}</td>
                          <td style={{ padding: '13px 20px', fontWeight: 600, color: C.text }}>{e.nombre_empresa}</td>
                          <td style={{ padding: '13px 20px', color: C.muted, fontSize: 12 }}>
                            {new Date(e.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Placeholder futuro */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', opacity: 0.65 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Liquidaciones e historial</h2>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>Próximamente: facturas, liquidaciones de IVA, sueldos e IIBB asociadas a este cliente.</p>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
