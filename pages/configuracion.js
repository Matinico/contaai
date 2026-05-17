import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';
import { authFetch } from '../lib/auth-fetch';
import Sidebar from '../components/Sidebar';

const C = {
  bg:     '#f0f2f5',
  navy:   '#1a3a5c',
  accent: '#7eb8f7',
  white:  '#ffffff',
  text:   '#1e293b',
  muted:  '#64748b',
  border: '#dde1e7',
  green:  '#16a34a',
  red:    '#dc2626',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
};

const card = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' };
const lbl  = { display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inp  = { width: '100%', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 14, outline: 'none', fontFamily: C.font };
function formatCuit(v) { const d = String(v||'').replace(/\D/g,'').slice(0,11); if(d.length<=2)return d; if(d.length<=10)return`${d.slice(0,2)}-${d.slice(2)}`; return`${d.slice(0,2)}-${d.slice(2,10)}-${d.slice(10)}`; }

export default function Configuracion() {
  const { user, signOut } = useAuth();
  const router  = useRouter();
  const [toast,       setToast]       = useState(null);

  // Estudio + equipo
  const [estudioData, setEstudioData] = useState(null);
  const [miembros,    setMiembros]    = useState([]);
  const [rol,         setRol]         = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Edit estudio modal
  const [editModal,  setEditModal]  = useState(false);
  const [editForm,   setEditForm]   = useState({ nombre: '', cuit: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState('');

  // Invite modal
  const [invModal,  setInvModal]  = useState(false);
  const [invEmail,  setInvEmail]  = useState('');
  const [invSaving, setInvSaving] = useState(false);
  const [invError,  setInvError]  = useState('');
  const [invLink,   setInvLink]   = useState('');
  const [copied,    setCopied]    = useState(false);

  useEffect(() => { if (user === null) router.replace('/login'); }, [user, router]);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    setDataLoading(true);
    try {
      const r = await authFetch('/api/configuracion');
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 404) router.replace('/onboarding');
        setDataLoading(false);
        return;
      }
      if (d.rol === 'operador') { router.replace('/dashboard'); return; }
      setEstudioData(d.estudio);
      setMiembros(d.miembros || []);
      setRol(d.rol);
    } catch (_) {}
    setDataLoading(false);
  }

  // ── Edit estudio ──────────────────────────────────────────────────────────
  function openEdit() {
    setEditForm({ nombre: estudioData?.nombre || '', cuit: estudioData?.cuit || '' });
    setEditError(''); setEditModal(true);
  }

  async function saveEdit() {
    setEditError('');
    if (!editForm.nombre.trim()) { setEditError('El nombre es obligatorio.'); return; }
    if (!editForm.cuit.trim())   { setEditError('El CUIT es obligatorio.'); return; }
    setEditSaving(true);
    try {
      const r = await authFetch('/api/configuracion', { method: 'PUT', body: JSON.stringify(editForm) });
      const d = await r.json();
      if (!r.ok) { setEditError(d.error || 'Error al guardar.'); setEditSaving(false); return; }
      setEstudioData(d);
      setEditModal(false);
      showToast('Estudio actualizado.');
    } catch { setEditError('Error de conexión.'); }
    setEditSaving(false);
  }

  // ── Invite ────────────────────────────────────────────────────────────────
  function openInvite() {
    setInvEmail(''); setInvError(''); setInvLink(''); setCopied(false); setInvModal(true);
  }

  async function generateLink() {
    setInvError(''); setInvLink(''); setCopied(false);
    if (!invEmail.trim()) { setInvError('El email es obligatorio.'); return; }
    setInvSaving(true);
    try {
      const r = await authFetch('/api/invitaciones', { method: 'POST', body: JSON.stringify({ email: invEmail }) });
      const d = await r.json();
      if (!r.ok) { setInvError(d.error || 'Error al generar el link.'); setInvSaving(false); return; }
      setInvLink(d.link);
    } catch { setInvError('Error de conexión.'); }
    setInvSaving(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(invLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Utils ─────────────────────────────────────────────────────────────────
  function showToast(msg, isErr = false) {
    setToast({ msg, isErr }); setTimeout(() => setToast(null), 3500);
  }

  const isAdmin  = rol === 'admin';

  if (user === undefined || user === null) {
    return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font, color: C.muted, fontSize: 14 }}>Cargando…</div>;
  }

  return (
    <>
      <Head>
        <title>Configuración — CIA</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};color:${C.text};font-family:${C.font};min-height:100vh;}
        input,button{font-family:${C.font};}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar user={user} rol={rol} onSignOut={() => signOut().then(() => router.replace('/login'))} />

        <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>

          {/* Topbar */}
          <div style={{ height: 56, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 30 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Configuración</span>
          </div>

          {/* ── BODY ── */}
          <main style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '36px 24px' }}>

        {/* ── Mi estudio (admin only) ── */}
        {isAdmin && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ ...card, padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Mi estudio</div>
                {!dataLoading && estudioData && (
                  <button onClick={openEdit}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: C.navy, cursor: 'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9 2l2 2-7 7H2v-2L9 2z" stroke={C.navy} strokeWidth="1.3" strokeLinejoin="round"/></svg>
                    Editar
                  </button>
                )}
              </div>
              {dataLoading ? (
                <div style={{ color: C.muted, fontSize: 13 }}>Cargando…</div>
              ) : estudioData ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={lbl}>Nombre del estudio</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{estudioData.nombre}</div>
                  </div>
                  <div>
                    <div style={lbl}>CUIT</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "'Courier New',monospace" }}>{estudioData.cuit}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.muted }}>No se encontraron datos del estudio.</div>
              )}
            </div>
          </section>
        )}

        {/* ── Equipo (admin only) ── */}
        {isAdmin && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Equipo</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {dataLoading ? '…' : `${miembros.length} miembro${miembros.length !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <button onClick={openInvite}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.navy, border: 'none', borderRadius: 7, padding: '8px 16px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5v10M1.5 6.5h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Invitar empleado
                </button>
              </div>

              {dataLoading ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Cargando…</div>
              ) : miembros.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
                  Todavía no hay miembros en el equipo.
                </div>
              ) : (
                <div>
                  {miembros.map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: i < miembros.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8f3fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.navy, flexShrink: 0 }}>
                          {(m.nombre || m.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{m.nombre || '—'}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{m.email || 'Sin email'}</div>
                        </div>
                      </div>
                      <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.rol === 'admin' ? '#e8f3fd' : '#f1f5f9', color: m.rol === 'admin' ? C.navy : C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {m.rol}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Información de cuenta ── */}
        <section>
          <div style={{ ...card, padding: '24px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Información de cuenta</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={lbl}>Nombre</div>
                <div style={{ fontSize: 14, color: C.text }}>{user?.user_metadata?.name || '—'}</div>
              </div>
              <div>
                <div style={lbl}>Email</div>
                <div style={{ fontSize: 14, color: C.text }}>{user?.email}</div>
              </div>
              {!dataLoading && rol && (
                <div>
                  <div style={lbl}>Rol</div>
                  <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: isAdmin ? '#e8f3fd' : '#f1f5f9', color: isAdmin ? C.navy : C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {rol}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
          </main>
        </div>
      </div>

      {/* ── MODAL: editar estudio ── */}
      {editModal && (
        <div onClick={() => setEditModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 14, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', animation: 'slideUp 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Editar estudio</div>
              <button onClick={() => setEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Nombre del estudio <span style={{ color: C.red }}>*</span></label>
                <input value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} style={inp} autoFocus />
              </div>
              <div>
                <label style={lbl}>CUIT <span style={{ color: C.red }}>*</span></label>
                <input value={editForm.cuit} onChange={e => setEditForm(f => ({ ...f, cuit: formatCuit(e.target.value) }))} placeholder="20-12345678-9" style={inp} />
              </div>
              {editError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 14px', fontSize: 13, color: C.red }}>{editError}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setEditModal(false)} style={{ background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '8px 18px', fontSize: 13, color: C.muted, cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
              <button onClick={saveEdit} disabled={editSaving} style={{ background: editSaving ? '#94a3b8' : C.navy, border: 'none', borderRadius: 7, padding: '8px 22px', fontSize: 13, color: 'white', fontWeight: 600, cursor: editSaving ? 'not-allowed' : 'pointer' }}>
                {editSaving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: invitar empleado ── */}
      {invModal && (
        <div onClick={() => !invLink && setInvModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 14, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', animation: 'slideUp 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Invitar empleado</div>
              <button onClick={() => setInvModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!invLink ? (
                <>
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                    Ingresá el email del empleado para generar su link de invitación.
                    Después lo podés mandar por WhatsApp o cualquier otro medio.
                  </p>
                  <div>
                    <label style={lbl}>Email del empleado <span style={{ color: C.red }}>*</span></label>
                    <input value={invEmail} onChange={e => setInvEmail(e.target.value)}
                      type="email" placeholder="empleado@empresa.com" style={inp} autoFocus
                      onKeyDown={e => e.key === 'Enter' && generateLink()} />
                  </div>
                  {invError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 14px', fontSize: 13, color: C.red }}>{invError}</div>}
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l5 5 7-8" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Link generado</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Copiá el link y mandáselo al empleado</div>
                  </div>

                  <div style={{ background: '#f8f9fb', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Link de invitación</div>
                    <div style={{ fontSize: 12, color: C.text, wordBreak: 'break-all', fontFamily: "'Courier New',monospace", lineHeight: 1.5 }}>{invLink}</div>
                  </div>

                  <button onClick={copyLink}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px', background: copied ? '#dcfce7' : C.navy, color: copied ? C.green : 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {copied ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="1" width="9" height="11" rx="1.5" stroke="white" strokeWidth="1.4"/><rect x="2" y="4" width="9" height="11" rx="1.5" stroke="white" strokeWidth="1.4" fill="none"/></svg>
                        Copiar link
                      </>
                    )}
                  </button>

                  <button onClick={() => { setInvLink(''); setInvEmail(''); setCopied(false); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.muted, textDecoration: 'underline', textAlign: 'center' }}>
                    Generar otro link
                  </button>
                </>
              )}
            </div>

            {!invLink && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setInvModal(false)} style={{ background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '8px 18px', fontSize: 13, color: C.muted, cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
                <button onClick={generateLink} disabled={invSaving} style={{ background: invSaving ? '#94a3b8' : C.navy, border: 'none', borderRadius: 7, padding: '8px 22px', fontSize: 13, color: 'white', fontWeight: 600, cursor: invSaving ? 'not-allowed' : 'pointer' }}>
                  {invSaving ? 'Generando…' : 'Generar link'}
                </button>
              </div>
            )}
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
