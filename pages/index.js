import Head from 'next/head';
import { useState, useRef, useEffect } from 'react';
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
  green:  '#16a34a',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
};

const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inp = { width: '100%', background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' };

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const menuRef = useRef(null);

  const [menu, setMenu]       = useState(false);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ nombre: '', descripcion: '', empresas: [{ cuit: '', nombre_empresa: '' }] });
  const [formError, setFormError] = useState('');
  const [toast, setToast]     = useState(null);

  useEffect(() => { if (status === 'unauthenticated') router.replace('/login'); }, [status, router]);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') loadClientes();
  }, [status]);

  async function loadClientes() {
    setLoading(true);
    try {
      const r = await fetch('/api/clientes');
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
    if (!form.nombre.trim()) { setFormError('El nombre del cliente es obligatorio.'); return; }
    if (!form.descripcion.trim()) { setFormError('La descripción es obligatoria.'); return; }
    for (let i = 0; i < form.empresas.length; i++) {
      if (!form.empresas[i].cuit.trim()) { setFormError(`Completá el CUIT de la empresa ${i + 1}.`); return; }
      if (!form.empresas[i].nombre_empresa.trim()) { setFormError(`Completá la razón social de la empresa ${i + 1}.`); return; }
    }
    setSaving(true);
    setFormError('');
    try {
      const r = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
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

  if (status === 'loading' || status === 'unauthenticated') {
    return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font, color: C.muted }}>Cargando…</div>;
  }

  const name = session?.user?.name || session?.user?.email?.split('@')[0] || 'usuario';

  return (
    <>
      <Head><title>CIA — Dashboard</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};color:${C.text};font-family:${C.font};min-height:100vh;}
        input,select,textarea,button{font-family:${C.font};}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .row-hover:hover td{background:#f8fafc;cursor:pointer;}
        .btn-ghost:hover{color:${C.red}!important;}
      `}</style>

      {/* HEADER */}
      <header style={{ background: C.navy, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="2" width="11" height="14" rx="1.5" stroke="white" strokeWidth="1.5"/>
              <path d="M6 7h5M6 10h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="15" cy="14" r="4" fill={C.navy} stroke="white" strokeWidth="1.5"/>
              <path d="M13 14l1.5 1.5L17 12.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: '0.02em' }}>CIA</span>
        </div>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, padding: '6px 12px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {(session?.user?.email || 'U')[0].toUpperCase()}
            </div>
            <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
              {session?.user?.name || session?.user?.email}
            </span>
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

        {/* Welcome */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text }}>
            Bienvenido, {name.charAt(0).toUpperCase() + name.slice(1)}
          </h1>
        </div>

        {/* Clientes */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Clientes del estudio</h2>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {loading ? '…' : `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <button onClick={openModal}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.navy, border: 'none', borderRadius: 7, padding: '8px 16px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Nuevo cliente
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: C.muted, fontSize: 14 }}>Cargando…</div>
          ) : clientes.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: C.navyLt, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="8" r="3.5" stroke={C.navy} strokeWidth="1.5"/>
                  <path d="M4 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>No hay clientes cargados aún</div>
              <div style={{ fontSize: 13, color: C.muted }}>Hacé clic en "Nuevo cliente" para agregar el primero.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Nombre', 'Empresas', 'Última actividad', ''].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }} onClick={() => router.push(`/clientes/${c.id}`)}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600, color: C.text }}>{c.nombre}</div>
                        {c.descripcion && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{c.descripcion}</div>}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {c.empresas?.length > 0
                          ? <span style={{ background: C.navyLt, color: C.navy, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                              {c.empresas.length} empresa{c.empresas.length !== 1 ? 's' : ''}
                            </span>
                          : <span style={{ color: '#94a3b8', fontSize: 12 }}>Sin empresas</span>
                        }
                      </td>
                      <td style={{ padding: '14px 20px', color: C.muted, fontSize: 12 }}>{fmtDate(c.ultima_actividad)}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.navy, background: C.navyLt, padding: '5px 12px', borderRadius: 6 }}>Ver detalle →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Módulos */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Módulos</div>
        <Link href="/iva" style={{ display: 'block', textDecoration: 'none' }}>
          <div
            style={{ background: C.white, border: `1px solid ${C.navy}`, borderTop: `3px solid ${C.navy}`, borderRadius: 10, padding: '18px 20px', boxShadow: '0 2px 8px rgba(26,58,92,0.08)', display: 'flex', alignItems: 'center', gap: 16, transition: 'box-shadow 0.15s, transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,58,92,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,58,92,0.08)'; e.currentTarget.style.transform = 'none'; }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="4" y="3" width="15" height="19" rx="2" stroke="#1a3a5c" strokeWidth="1.6"/>
              <path d="M8 9h7M8 13h5M8 17h6" stroke="#1a3a5c" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="21" cy="21" r="6" fill="#e8f0f7" stroke="#1a3a5c" strokeWidth="1.4"/>
              <path d="M19 21l1.5 1.5L23 19" stroke="#1a3a5c" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>Liquidación de IVA</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Registrá comprobantes de compras y ventas, calculá la posición IVA y exportá el Libro.</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.navy, background: C.navyLt, padding: '5px 12px', borderRadius: 5, whiteSpace: 'nowrap' }}>Acceder →</span>
          </div>
        </Link>
      </div>

      {/* MODAL — Nuevo cliente */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Nuevo cliente</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, borderRadius: 4, display: 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>Nombre del cliente <span style={{ color: C.red }}>*</span></label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: García & Asociados"
                  style={inp}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Descripción <span style={{ color: C.red }}>*</span></label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Notas sobre el cliente…"
                  rows={2}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>

              {/* Empresas */}
              <div>
                <label style={{ ...lbl, marginBottom: 12 }}>Empresas <span style={{ color: C.red }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {form.empresas.map((emp, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div style={{ flex: '0 0 145px' }}>
                        {i === 0 && <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>CUIT <span style={{ color: C.red }}>*</span></div>}
                        <input
                          value={emp.cuit}
                          onChange={e => updateEmpresa(i, 'cuit', e.target.value)}
                          placeholder="20-12345678-9"
                          style={inp}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        {i === 0 && <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Razón social <span style={{ color: C.red }}>*</span></div>}
                        <input
                          value={emp.nombre_empresa}
                          onChange={e => updateEmpresa(i, 'nombre_empresa', e.target.value)}
                          placeholder="Nombre de la empresa"
                          style={inp}
                        />
                      </div>
                      {form.empresas.length > 1 && (
                        <button onClick={() => removeEmpresa(i)} className="btn-ghost"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: '8px 6px', borderRadius: 4, display: 'flex', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addEmpresa}
                  style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px dashed ${C.border}`, borderRadius: 6, padding: '7px 14px', color: C.muted, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Agregar empresa
                </button>
              </div>

              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: C.red, marginTop: 16 }}>
                  {formError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setModal(false)}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 18px', fontSize: 13, color: C.muted, cursor: 'pointer', fontWeight: 500 }}>
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

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${toast.isErr ? C.red : C.green}`, borderRadius: 8, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 300, animation: 'slideUp 0.2s ease', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: 14 }}>{toast.isErr ? '✗' : '✓'}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
