import Head from 'next/head';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { authFetch } from '../lib/auth-fetch';
import { useRole } from '../lib/use-role';
import { useRouter } from 'next/router';
import Link from 'next/link';

const C = {
  bg:     '#f0f2f5',
  navy:   '#1a3a5c',
  accent: '#7eb8f7',
  white:  '#ffffff',
  text:   '#1e293b',
  muted:  '#64748b',
  border: '#dde1e7',
  red:    '#dc2626',
  green:  '#16a34a',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
};

const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inp = { width: '100%', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', fontFamily: C.font };

function greeting(name) {
  const h = new Date().getHours();
  const sal = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${sal}, ${name.charAt(0).toUpperCase() + name.slice(1)}`;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const menuRef = useRef(null);

  const { rol } = useRole({ redirectIfNoMembership: false });

  const [menu,            setMenu]            = useState(false);
  const [clientes,        setClientes]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [modal,           setModal]           = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [form,            setForm]            = useState({ nombre: '', descripcion: '', empresas: [{ cuit: '', nombre_empresa: '' }] });
  const [formError,       setFormError]       = useState('');
  const [toast,           setToast]           = useState(null);
  const [onboardingReady, setOnboardingReady] = useState(false);

  useEffect(() => { if (user === null) router.replace('/login'); }, [user, router]);

  // Check onboarding before showing dashboard
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

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

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
    setForm({ nombre: '', descripcion: '', empresas: [{ cuit: '', nombre_empresa: '' }] });
    setFormError('');
    setModal(true);
  }

  function addEmpresa() {
    setForm(f => ({ ...f, empresas: [...f.empresas, { cuit: '', nombre_empresa: '' }] }));
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

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  if (user === undefined || user === null || !onboardingReady) {
    return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font, color: C.muted, fontSize: 14 }}>Cargando…</div>;
  }

  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'usuario';
  const initials = (user?.user_metadata?.name || user?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <>
      <Head><title>CIA — Dashboard</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};color:${C.text};font-family:${C.font};min-height:100vh;}
        input,select,textarea,button{font-family:${C.font};}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .row-hover:hover{background:#f5f7fa;cursor:pointer;}
        .menu-item:hover{background:#f5f7fa;}
      `}</style>

      {/* ── TOPBAR ── */}
      <header style={{ background: C.navy, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
            <rect x="8" y="4" width="30" height="38" rx="3" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="2"/>
            <path d="M15 15h16M15 22h12M15 29h14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="39" cy="40" r="12" fill={C.accent}/>
            <path d="M33 40l4.5 4.5L46 34" stroke={C.navy} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 20, letterSpacing: '2px' }}>CIA</span>
        </div>

        {/* User menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '6px 12px 6px 8px', color: 'white', cursor: 'pointer' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.navy, flexShrink: 0 }}>
              {initials}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.user_metadata?.name || user?.email}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>

          {menu && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, width: 230, boxShadow: '0 8px 28px rgba(0,0,0,0.13)', overflow: 'hidden', animation: 'fadeIn 0.15s ease', zIndex: 100 }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{user?.user_metadata?.name || '—'}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{user?.email}</div>
              </div>
              <div style={{ padding: '6px 0' }}>
                {rol === 'admin' && (
                  <>
                    <Link href="/configuracion" onClick={() => setMenu(false)}
                      className="menu-item"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: C.text, textDecoration: 'none' }}>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2.5" stroke={C.muted} strokeWidth="1.3"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.7 2.7l1.06 1.06M11.24 11.24l1.06 1.06M2.7 12.3l1.06-1.06M11.24 3.76l1.06-1.06" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round"/></svg>
                      Configuración
                    </Link>
                    <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
                  </>
                )}
                <button onClick={() => signOut().then(() => router.replace('/login'))}
                  className="menu-item"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.red, fontWeight: 600, textAlign: 'left' }}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10 11l3-3.5L10 4M13 7.5H5.5M5.5 2H2v11h3.5" stroke={C.red} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '44px 24px' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.navy, marginBottom: 4 }}>
            {greeting(name)}
          </h1>
          <p style={{ fontSize: 14, color: C.muted }}>
            {user?.user_metadata?.estudio || 'Gestioná los clientes de tu estudio desde acá.'}
          </p>
        </div>

        {/* Clientes card */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Clientes del estudio</h2>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {loading ? '…' : `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {rol === 'admin' && (
              <button onClick={openModal}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.navy, border: 'none', borderRadius: 7, padding: '8px 16px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5v10M1.5 6.5h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                Nuevo cliente
              </button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '52px 24px', textAlign: 'center', color: C.muted, fontSize: 14 }}>Cargando…</div>
          ) : clientes.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: '#e8f3fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="8" r="3.5" stroke={C.navy} strokeWidth="1.5"/>
                  <path d="M4 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>No hay clientes cargados aún</div>
              <div style={{ fontSize: 13, color: C.muted }}>Hacé clic en "+ Nuevo cliente" para agregar el primero.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f9fb' }}>
                    {['Nombre', 'Empresas', 'Última actividad', ''].map(h => (
                      <th key={h} style={{ padding: '10px 22px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }} onClick={() => router.push(`/clientes/${c.id}`)}>
                      <td style={{ padding: '15px 22px' }}>
                        <div style={{ fontWeight: 600, color: C.text }}>{c.nombre}</div>
                        {c.descripcion && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{c.descripcion}</div>}
                      </td>
                      <td style={{ padding: '15px 22px' }}>
                        {c.empresas?.length > 0
                          ? <span style={{ background: '#e8f3fd', color: C.navy, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                              {c.empresas.map(e => e.cuit).join(', ')}
                            </span>
                          : <span style={{ color: '#b0b8c4', fontSize: 12 }}>Sin empresas</span>
                        }
                      </td>
                      <td style={{ padding: '15px 22px', color: C.muted, fontSize: 12 }}>{fmtDate(c.ultima_actividad)}</td>
                      <td style={{ padding: '15px 22px', textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>Ver detalle →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL — Nuevo cliente ── */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', animation: 'slideUp 0.2s ease' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Nuevo cliente</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, borderRadius: 4, display: 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {form.empresas.map((emp, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div style={{ flex: '0 0 145px' }}>
                        {i === 0 && <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>CUIT <span style={{ color: C.red }}>*</span></div>}
                        <input value={emp.cuit} onChange={e => updateEmpresa(i, 'cuit', e.target.value)}
                          placeholder="20-12345678-9" style={inp} />
                      </div>
                      <div style={{ flex: 1 }}>
                        {i === 0 && <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Razón social <span style={{ color: C.red }}>*</span></div>}
                        <input value={emp.nombre_empresa} onChange={e => updateEmpresa(i, 'nombre_empresa', e.target.value)}
                          placeholder="Nombre de la empresa" style={inp} />
                      </div>
                      {form.empresas.length > 1 && (
                        <button onClick={() => removeEmpresa(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: '9px 6px', borderRadius: 4, display: 'flex', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addEmpresa}
                  style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px dashed ${C.border}`, borderRadius: 7, padding: '7px 14px', color: C.muted, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Agregar empresa
                </button>
              </div>

              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '10px 14px', fontSize: 13, color: C.red }}>
                  {formError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: `1px solid ${C.border}` }}>
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
