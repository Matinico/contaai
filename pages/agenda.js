import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';
import { authFetch } from '../lib/auth-fetch';
import { useRole } from '../lib/use-role';
import Sidebar from '../components/Sidebar';
import { todosLosVencimientos, mesPagoLabel } from '../lib/vencimientos';

const C = {
  navy:   '#1a3a5c',
  blue:   '#2563eb',
  green:  '#10b981',
  orange: '#f97316',
  red:    '#dc2626',
  white:  '#ffffff',
  bg:     '#f8fafc',
  text:   '#1e293b',
  muted:  '#64748b',
  border: '#e2e8f0',
};

import { FONT, SYNE } from '../lib/fonts';

function urgenciaConfig(diasRestantes) {
  if (diasRestantes < 3)  return { color: C.red,    bg: '#fef2f2',  label: diasRestantes <= 0 ? 'Vencido' : `${diasRestantes}d` };
  if (diasRestantes <= 7) return { color: C.orange,  bg: '#fff7ed',  label: `${diasRestantes}d` };
  return                         { color: '#15803d', bg: '#dcfce7',  label: `${diasRestantes}d` };
}

function formatCuitDisplay(cuit) {
  const d = String(cuit || '').replace(/\D/g, '');
  if (d.length !== 11) return cuit;
  return `${d.slice(0,2)}-${d.slice(2,10)}-${d.slice(10)}`;
}

function Topbar() {
  return (
    <div style={{
      height: 56, background: C.white, borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', position: 'sticky', top: 0, zIndex: 30, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>Consola activa</span>
      </div>
    </div>
  );
}

export default function Agenda() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { rol } = useRole({ redirectIfNoMembership: false });

  const [clientes, setClientes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [mesActivo, setMesActivo] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { if (user === null) router.replace('/login'); }, [user, router]);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/clientes')
      .then(r => r.json())
      .then(d => setClientes(Array.isArray(d) ? d : []))
      .catch(() => setClientes([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    const now = new Date();
    setMesActivo(now.getMonth());
  }, []);

  if (user === undefined || user === null) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: C.muted, fontSize: 14 }}>
        Cargando…
      </div>
    );
  }

  const todos = todosLosVencimientos(clientes);

  const filtrados = search.trim()
    ? todos.filter(v =>
        v.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
        v.cuit.includes(search) ||
        v.empresaNombre?.toLowerCase().includes(search.toLowerCase())
      )
    : todos;

  // Agrupar por mes de pago
  const porMes = {};
  for (let m = 0; m < 12; m++) porMes[m] = [];
  for (const v of filtrados) porMes[v.mesPago].push(v);

  const mesesConDatos = Object.entries(porMes).filter(([, vs]) => vs.length > 0);

  const totalVencidos   = todos.filter(v => v.diasRestantes <  0).length;
  const totalUrgentes   = todos.filter(v => v.diasRestantes >= 0 && v.diasRestantes < 3).length;
  const totalProximos   = todos.filter(v => v.diasRestantes >= 3 && v.diasRestantes <= 7).length;

  return (
    <>
      <Head>
        <title>CIA — Agenda de vencimientos</title>
      </Head>

      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${C.bg}; color: ${C.text}; font-family: ${FONT}; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
        .mes-tab { transition: background .12s, color .12s; }
        .mes-tab:hover { background: #f1f5f9 !important; }
        .mes-tab.activo { background: ${C.navy} !important; color: #fff !important; }
        .agenda-row:hover { background: #f8fafc !important; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar
          activePage="/agenda"
          clientCount={clientes.length}
          user={user}
          rol={rol}
          onSignOut={() => signOut().then(() => router.replace('/login'))}
        />

        <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>
          <Topbar />

          <main style={{ flex: 1, padding: '28px 28px 48px' }}>

            {/* Encabezado */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: SYNE, fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 4 }}>
                Agenda de vencimientos
              </h1>
              <p style={{ fontSize: 13, color: C.muted }}>
                IVA 2026 — todos los clientes del estudio
              </p>
            </div>

            {/* Chips de resumen */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Vencidos',        value: totalVencidos,  color: C.red,    bg: '#fef2f2'  },
                { label: 'Urgentes (< 3d)', value: totalUrgentes,  color: C.orange,  bg: '#fff7ed'  },
                { label: 'Próximos (≤ 7d)', value: totalProximos,  color: '#15803d', bg: '#dcfce7'  },
                { label: 'Total períodos',  value: todos.length,   color: C.navy,    bg: '#eff6ff'  },
              ].map(chip => (
                <div key={chip.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: chip.bg, border: `1px solid ${chip.color}22`, borderRadius: 8, padding: '8px 14px' }}>
                  <span style={{ fontFamily: SYNE, fontSize: 20, fontWeight: 800, color: chip.color }}>{loading ? '—' : chip.value}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: chip.color }}>{chip.label}</span>
                </div>
              ))}
            </div>

            {/* Buscador */}
            <div style={{ marginBottom: 20, position: 'relative', maxWidth: 320 }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke={C.muted} strokeWidth="1.4"/>
                <path d="M10 10l-2-2" stroke={C.muted} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                placeholder="Buscar cliente o CUIT…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '9px 12px 9px 30px', color: C.text, fontSize: 13, outline: 'none', fontFamily: FONT }}
              />
            </div>

            {/* Tabs de meses */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
              {Array.from({ length: 12 }, (_, i) => {
                const count = porMes[i]?.length || 0;
                const activo = mesActivo === i;
                return (
                  <button
                    key={i}
                    onClick={() => setMesActivo(activo ? null : i)}
                    className={`mes-tab${activo ? ' activo' : ''}`}
                    style={{
                      padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.border}`,
                      background: activo ? C.navy : C.white, color: activo ? '#fff' : C.muted,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    {mesPagoLabel(i)}
                    {count > 0 && (
                      <span style={{ background: activo ? 'rgba(255,255,255,0.25)' : '#dbeafe', color: activo ? '#fff' : C.blue, fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '0 5px', lineHeight: '16px' }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              {mesActivo !== null && (
                <button
                  onClick={() => setMesActivo(null)}
                  style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Ver todos
                </button>
              )}
            </div>

            {/* Contenido */}
            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: C.muted, fontSize: 14 }}>Cargando…</div>
            ) : filtrados.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Sin vencimientos</div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {clientes.length === 0 ? 'No hay clientes con empresas registradas.' : 'No se encontraron resultados para esa búsqueda.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {(mesActivo !== null ? [[mesActivo, porMes[mesActivo]]] : mesesConDatos).map(([mes, vencimientos]) => (
                  <div key={mes} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    {/* Cabecera del mes */}
                    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc' }}>
                      <span style={{ fontFamily: SYNE, fontSize: 14, fontWeight: 700, color: C.navy }}>
                        {mesPagoLabel(Number(mes))}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        — IVA período {/* mes anterior */}
                        {mesPagoLabel((Number(mes) + 11) % 12)}
                      </span>
                      <span style={{ marginLeft: 'auto', background: '#dbeafe', color: C.blue, fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '2px 8px' }}>
                        {vencimientos.length} {vencimientos.length === 1 ? 'empresa' : 'empresas'}
                      </span>
                    </div>

                    {/* Tabla */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['Cliente', 'Empresa', 'CUIT', 'Fecha vencimiento', 'Días restantes'].map(h => (
                              <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {vencimientos.map((v, i) => {
                            const urg = urgenciaConfig(v.diasRestantes);
                            return (
                              <tr
                                key={`${v.clienteId}-${v.cuit}-${v.mesPago}`}
                                className="agenda-row"
                                style={{ borderBottom: i < vencimientos.length - 1 ? `1px solid ${C.border}` : 'none', background: C.white }}
                              >
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: C.text }}>{v.clienteNombre}</td>
                                <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12 }}>{v.empresaNombre || '—'}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ background: '#eff6ff', color: C.blue, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, fontFamily: "'Courier New',monospace" }}>
                                    {formatCuitDisplay(v.cuit)}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', color: C.text, fontSize: 12, whiteSpace: 'nowrap' }}>
                                  {v.fecha.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ background: urg.bg, color: urg.color, fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                                    {urg.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
