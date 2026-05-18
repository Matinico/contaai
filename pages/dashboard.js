import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { authFetch } from '../lib/auth-fetch';
import { useRole } from '../lib/use-role';
import Sidebar from '../components/Sidebar';
import { proximosVencimientos, vencimientoIVA } from '../lib/vencimientos';

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

const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inp = { width: '100%', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', fontFamily: FONT };

function formatCuit(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

function greeting(name) {
  const h = new Date().getHours();
  const sal = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${sal}, ${name.charAt(0).toUpperCase() + name.slice(1)}`;
}

function periodoActual() {
  return new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function clienteEstado(c) {
  if (!c.ultima_actividad) return { label: 'Sin actividad', color: C.muted, bg: '#f1f5f9' };
  const dias = (Date.now() - new Date(c.ultima_actividad)) / 86400000;
  if (dias <= 30) return { label: 'Al día', color: '#15803d', bg: '#dcfce7' };
  if (dias <= 90) return { label: 'Pendiente', color: '#92400e', bg: '#fef9c3' };
  return { label: 'Inactivo', color: C.muted, bg: '#f1f5f9' };
}

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px', borderTop: `3px solid ${accent}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: FONT }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: SYNE, fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar() {
  return (
    <div style={{
      height: 56, background: C.white, borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', position: 'sticky', top: 0, zIndex: 30, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, display: 'inline-block', animation: 'pulseDot 2s infinite' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>Consola activa</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.green }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
          ARCA Conectado
        </div>
        <button style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 8px', cursor: 'pointer', fontSize: 15, lineHeight: 1, color: C.muted, display: 'flex', alignItems: 'center' }} title="Notificaciones">
          🔔
        </button>
        <button style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 8px', cursor: 'pointer', fontSize: 15, lineHeight: 1, color: C.muted, display: 'flex', alignItems: 'center' }} title="Modo oscuro (próximamente)">
          🌙
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { rol } = useRole({ redirectIfNoMembership: false });

  const [clientes,        setClientes]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [search,          setSearch]          = useState('');
  const [filter,          setFilter]          = useState('todos');
  const [modal,           setModal]           = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [form,            setForm]            = useState({ nombre: '', descripcion: '', empresas: [{ cuit: '', nombre_empresa: '', actividad: '', direccion: '', provincia: '', localidad: '' }] });
  const [formError,       setFormError]       = useState('');
  const [toast,           setToast]           = useState(null);

  useEffect(() => { if (user === null) router.replace('/login'); }, [user, router]);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/onboarding')
      .then(r => r.json())
      .then(d => {
        if (!d.completed) router.replace('/onboarding');
        else setOnboardingReady(true);
      })
      .catch(() => setOnboardingReady(true));
  }, [user, router]);

  useEffect(() => { if (onboardingReady) loadClientes(); }, [onboardingReady]);

  async function loadClientes() {
    setLoading(true);
    try {
      const r = await authFetch('/api/clientes');
      const data = await r.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setForm({ nombre: '', descripcion: '', empresas: [{ cuit: '', nombre_empresa: '', actividad: '', direccion: '', provincia: '', localidad: '' }] });
    setFormError('');
    setModal(true);
  }

  function addEmpresa() {
    setForm(f => ({ ...f, empresas: [...f.empresas, { cuit: '', nombre_empresa: '', actividad: '', direccion: '', provincia: '', localidad: '' }] }));
  }

  function removeEmpresa(i) {
    setForm(f => ({ ...f, empresas: f.empresas.filter((_, idx) => idx !== i) }));
  }

  function updateEmpresa(i, key, val) {
    setForm(f => {
      const emps = [...f.empresas];
      emps[i] = { ...emps[i], [key]: val };
      return { ...f, empresas: emps };
    });
  }

  async function handleSave() {
    if (!form.nombre.trim())      { setFormError('El nombre del cliente es obligatorio.'); return; }
    if (!form.descripcion.trim()) { setFormError('La descripción es obligatoria.'); return; }
    for (let i = 0; i < form.empresas.length; i++) {
      if (!form.empresas[i].cuit.trim())           { setFormError(`Completá el CUIT de la empresa ${i + 1}.`); return; }
      if (!form.empresas[i].nombre_empresa.trim()) { setFormError(`Completá la razón social de la empresa ${i + 1}.`); return; }
    }
    setSaving(true);
    setFormError('');
    try {
      const r = await authFetch('/api/clientes', { method: 'POST', body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) { setFormError(data.error || 'Error al guardar'); setSaving(false); return; }
      setModal(false);
      showToast('Cliente creado correctamente');
      loadClientes();
    } catch {
      setFormError('Error de red');
    } finally {
      setSaving(false);
    }
  }

  function showToast(msg, isErr = false) {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 3500);
  }

  if (user === undefined || user === null || !onboardingReady) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: C.muted, fontSize: 14 }}>
        Cargando…
      </div>
    );
  }

  const name    = user?.user_metadata?.name || user?.email?.split('@')[0] || 'usuario';
  const estudio = user?.user_metadata?.estudio || '';

  // Derived KPIs
  const activos     = clientes.length;
  const pendientes  = clientes.filter(c => clienteEstado(c).label === 'Pendiente').length;
  const vencen7dias = loading ? 0 : proximosVencimientos(clientes, 7).length;

  const ivaVencidoEsteMes = loading ? 0 : (() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const mes = hoy.getMonth();
    return clientes.filter(c =>
      (c.empresas || []).some(e => e.cuit && vencimientoIVA(e.cuit, mes) < hoy)
    ).length;
  })();

  // Filtered clients for table
  const clientesFiltrados = clientes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || c.nombre?.toLowerCase().includes(q)
      || c.empresas?.some(e => e.cuit?.includes(q) || e.nombre_empresa?.toLowerCase().includes(q));
    const matchFilter = filter === 'todos' || (filter === 'pendientes' && clienteEstado(c).label === 'Pendiente');
    return matchSearch && matchFilter;
  });

  const proximos = proximosVencimientos(clientes, 60).slice(0, 5);

  const vencimientos = proximos.map(v => {
    const urgencia = v.diasRestantes <= 2 ? 'alta' : v.diasRestantes <= 7 ? 'media' : 'baja';
    return {
      fecha: v.fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      desc: `${v.clienteNombre} — IVA ${v.periodo}`,
      urgencia,
      diasRestantes: v.diasRestantes,
    };
  });

  return (
    <>
      <Head>
        <title>CIA — Dashboard</title>
      </Head>

      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${C.bg}; color: ${C.text}; font-family: ${FONT}; min-height: 100vh; }
        input, select, textarea, button { font-family: ${FONT}; }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(4px) }  to { opacity:1; transform:translateY(0) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulseDot {
          0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(16,185,129,.4); }
          50%      { opacity:.8; box-shadow:0 0 0 5px rgba(16,185,129,0); }
        }
        .row-hover:hover { background: #f1f5f9 !important; cursor: pointer; }
        .btn-filter { transition: background .12s, color .12s; }
        .btn-filter.active { background: ${C.navy} !important; color: #fff !important; }
        .btn-filter:not(.active):hover { background: #f1f5f9 !important; }
      `}</style>

      {/* ── Layout shell ── */}
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        <Sidebar
          activePage="/dashboard"
          clientCount={activos}
          user={user}
          rol={rol}
          onSignOut={() => signOut().then(() => router.replace('/login'))}
        />

        {/* ── Main (offset by sidebar) ── */}
        <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>

          <Topbar />

          {/* ── Body ── */}
          <main style={{ flex: 1, padding: '28px 28px 48px' }}>

            {/* Greeting */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: SYNE, fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 4 }}>
                {greeting(name)}
              </h1>
              <p style={{ fontSize: 13, color: C.muted }}>
                {estudio ? `${estudio} · ` : ''}{periodoActual()}
              </p>
            </div>

            {/* ── KPI Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }} className="kpi-grid">
              <KpiCard label="Clientes activos"      value={loading ? '…' : activos}           sub="en el estudio"                accent={C.navy}   icon="👥" />
              <KpiCard label="Vencimientos próximos" value={loading ? '…' : vencen7dias}       sub="vencen en 7 días"             accent={C.orange} icon="⏰" />
              <KpiCard label="IVA vencido este mes"  value={loading ? '…' : ivaVencidoEsteMes} sub="vencimiento ya pasó este mes" accent={C.red}    icon="⚠️" />
            </div>

            {/* ── Main grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }} className="main-grid">

              {/* ── Tabla de clientes ── */}
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

                {/* Table header */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: SYNE, fontSize: 15, fontWeight: 700, color: C.text }}>Clientes del estudio</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                      <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <circle cx="5.5" cy="5.5" r="4" stroke={C.muted} strokeWidth="1.4"/>
                        <path d="M10 10l-2-2" stroke={C.muted} strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <input
                        placeholder="Buscar cliente o CUIT…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ ...inp, paddingLeft: 28, width: 220, fontSize: 12 }}
                      />
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, overflow: 'hidden' }}>
                      {['todos', 'pendientes'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                          className={`btn-filter${filter === f ? ' active' : ''}`}
                          style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: filter === f ? '#fff' : C.muted, textTransform: 'capitalize' }}>
                          {f === 'todos' ? 'Todos' : 'Pendientes'}
                        </button>
                      ))}
                    </div>

                    {/* New client button */}
                    {rol === 'admin' && (
                      <button onClick={openModal}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.navy, border: 'none', borderRadius: 7, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="white" strokeWidth="1.6" strokeLinecap="round"/></svg>
                        Nuevo cliente
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                {loading ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Cargando…</div>
                ) : clientesFiltrados.length === 0 ? (
                  <div style={{ padding: '56px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                      {search || filter !== 'todos' ? 'Sin resultados' : 'No hay clientes aún'}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      {search || filter !== 'todos' ? 'Probá con otro filtro o búsqueda.' : 'Creá el primer cliente del estudio.'}
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: C.bg }}>
                          {['Cliente', 'Empresas', 'Estado', 'Última actividad', ''].map(h => (
                            <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {clientesFiltrados.map(c => {
                          const est = clienteEstado(c);
                          return (
                            <tr key={c.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}
                              onClick={() => router.push(`/clientes/${c.id}`)}>
                              <td style={{ padding: '13px 16px' }}>
                                <div style={{ fontWeight: 600, color: C.text }}>{c.nombre}</div>
                                {c.descripcion && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{c.descripcion}</div>}
                              </td>
                              <td style={{ padding: '13px 16px' }}>
                                {c.empresas?.length > 0
                                  ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {c.empresas.slice(0, 2).map(e => (
                                        <span key={e.cuit} style={{ background: '#eff6ff', color: C.blue, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, fontFamily: "'Courier New',monospace" }}>
                                          {e.cuit}
                                        </span>
                                      ))}
                                      {c.empresas.length > 2 && <span style={{ color: C.muted, fontSize: 11 }}>+{c.empresas.length - 2}</span>}
                                    </div>
                                  : <span style={{ color: C.muted, fontSize: 11 }}>Sin empresas</span>
                                }
                              </td>
                              <td style={{ padding: '13px 16px' }}>
                                <span style={{ background: est.bg, color: est.color, fontSize: 11, fontWeight: 700, borderRadius: 12, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                                  {est.label}
                                </span>
                              </td>
                              <td style={{ padding: '13px 16px', color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
                                {fmtDate(c.ultima_actividad)}
                              </td>
                              <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: C.blue, whiteSpace: 'nowrap' }}>Ver →</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Right column ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Próximos vencimientos */}
                <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15 }}>⏰</span>
                      <h3 style={{ fontFamily: SYNE, fontSize: 13, fontWeight: 700, color: C.text }}>Próximos vencimientos</h3>
                    </div>
                    <Link href="/agenda" style={{ fontSize: 11, fontWeight: 600, color: C.blue, textDecoration: 'none' }}>Ver agenda →</Link>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    {loading ? (
                      <div style={{ padding: '20px 18px', textAlign: 'center', color: C.muted, fontSize: 12 }}>Cargando…</div>
                    ) : vencimientos.length === 0 ? (
                      <div style={{ padding: '20px 18px', textAlign: 'center', color: C.muted, fontSize: 12 }}>Sin vencimientos en los próximos 60 días</div>
                    ) : vencimientos.map((v, i) => {
                      const urgColor = v.urgencia === 'alta' ? C.red : v.urgencia === 'media' ? C.orange : '#15803d';
                      const urgBg    = v.urgencia === 'alta' ? '#fef2f2' : v.urgencia === 'media' ? '#fff7ed' : '#dcfce7';
                      const urgLabel = v.urgencia === 'alta' ? 'Urgente' : v.urgencia === 'media' ? `${v.diasRestantes}d` : `${v.diasRestantes}d`;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: i < vencimientos.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.desc}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{v.fecha}</div>
                          </div>
                          <span style={{ background: urgBg, color: urgColor, fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                            {urgLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Posición IVA consolidada */}
                <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>📊</span>
                    <h3 style={{ fontFamily: SYNE, fontSize: 13, fontWeight: 700, color: C.text }}>Posición IVA (cartera)</h3>
                  </div>
                  <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Débito fiscal total',  value: '—', color: C.red  },
                      { label: 'Crédito fiscal total', value: '—', color: C.green },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: C.muted }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
                      </div>
                    ))}
                    <div style={{ height: 1, background: C.border, margin: '2px 0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Saldo neto</span>
                      <span style={{ fontFamily: SYNE, fontSize: 16, fontWeight: 800, color: C.green }}>—</span>
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginTop: 4 }}>
                      El consolidado de IVA estará disponible cuando se procesen facturas de los clientes.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ── MODAL — Nuevo cliente ── */}
      {modal && (
        <div onClick={() => setModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.white, borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', animation: 'slideUp 0.2s ease' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontFamily: SYNE, fontSize: 15, fontWeight: 700, color: C.text }}>Nuevo cliente</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, borderRadius: 4, display: 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Nombre del cliente <span style={{ color: C.red }}>*</span></label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: García & Asociados" style={inp} />
              </div>
              <div>
                <label style={lbl}>Descripción <span style={{ color: C.red }}>*</span></label>
                <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Notas sobre el cliente…" rows={2}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 10 }}>Empresas <span style={{ color: C.red }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {form.empresas.map((emp, i) => (
                    <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: '13px 13px 9px', background: C.bg, position: 'relative' }}>
                      {form.empresas.length > 1 && (
                        <button onClick={() => removeEmpresa(i)}
                          style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, borderRadius: 4, display: 'flex' }}>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2L2 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                        </button>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={lbl}>Nombre empresa <span style={{ color: C.red }}>*</span></label>
                          <input value={emp.nombre_empresa} onChange={e => updateEmpresa(i, 'nombre_empresa', e.target.value)}
                            placeholder="Razón social" style={inp} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={lbl}>CUIT <span style={{ color: C.red }}>*</span></label>
                          <input value={emp.cuit} onChange={e => updateEmpresa(i, 'cuit', formatCuit(e.target.value))}
                            placeholder="20-12345678-9" style={inp} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={lbl}>Actividad <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span></label>
                          <input value={emp.actividad || ''} onChange={e => updateEmpresa(i, 'actividad', e.target.value)}
                            placeholder="Rubro o actividad principal" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Calle <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span></label>
                          <input value={emp.direccion || ''} onChange={e => updateEmpresa(i, 'direccion', e.target.value)}
                            placeholder="Dirección" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Provincia <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span></label>
                          <input value={emp.provincia || ''} onChange={e => updateEmpresa(i, 'provincia', e.target.value)}
                            placeholder="Provincia" style={inp} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={lbl}>Localidad <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span></label>
                          <input value={emp.localidad || ''} onChange={e => updateEmpresa(i, 'localidad', e.target.value)}
                            placeholder="Ciudad o localidad" style={inp} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addEmpresa}
                  style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px dashed ${C.border}`, borderRadius: 7, padding: '6px 12px', color: C.muted, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  Agregar empresa
                </button>
              </div>

              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 13px', fontSize: 13, color: C.red }}>
                  {formError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setModal(false)}
                style={{ background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '8px 18px', fontSize: 13, color: C.muted, cursor: 'pointer', fontWeight: 500 }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ background: saving ? '#94a3b8' : C.navy, border: 'none', borderRadius: 7, padding: '8px 22px', fontSize: 13, color: 'white', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${toast.isErr ? C.red : C.green}`, borderRadius: 8, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 300, animation: 'slideUp 0.2s ease', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
