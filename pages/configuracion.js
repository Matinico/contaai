import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { authFetch } from '../lib/auth-fetch';

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

export default function Configuracion() {
  const { user, signOut, supabase } = useAuth();
  const router  = useRouter();
  const menuRef = useRef(null);

  // UI state
  const [menu,        setMenu]        = useState(false);
  const [toast,       setToast]       = useState(null);
  const [error,       setError]       = useState('');

  // Estudio + equipo
  const [estudioData, setEstudioData] = useState(null);
  const [miembros,    setMiembros]    = useState([]);
  const [rol,         setRol]         = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Edit estudio modal
  const [editModal,   setEditModal]   = useState(false);
  const [editForm,    setEditForm]    = useState({ nombre: '', cuit: '' });
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState('');

  // Invite modal
  const [invModal,    setInvModal]    = useState(false);
  const [invEmail,    setInvEmail]    = useState('');
  const [invSaving,   setInvSaving]   = useState(false);
  const [invError,    setInvError]    = useState('');
  const [invLink,     setInvLink]     = useState('');

  // 2FA state
  const [factors,     setFactors]     = useState([]);
  const [loadingF,    setLoadingF]    = useState(true);
  const [enrolling,   setEnrolling]   = useState(false);
  const [qrCode,      setQrCode]      = useState(null);
  const [secret,      setSecret]      = useState(null);
  const [factorId,    setFactorId]    = useState(null);
  const [challengeId, setChallengeId] = useState(null);
  const [verifyCode,  setVerifyCode]  = useState('');
  const [unenrolling, setUnenrolling] = useState(false);
  const [mfaError,    setMfaError]    = useState('');

  useEffect(() => { if (user === null) router.replace('/login'); }, [user, router]);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (user) { loadData(); loadFactors(); }
  }, [user]);

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
      if (d.rol === 'operador') { router.replace('/'); return; }
      setEstudioData(d.estudio);
      setMiembros(d.miembros || []);
      setRol(d.rol);
    } catch (_) {}
    setDataLoading(false);
  }

  // ── 2FA ──────────────────────────────────────────────────────────────────
  async function loadFactors() {
    setLoadingF(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
    setLoadingF(false);
  }

  async function startEnroll() {
    setMfaError('');
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (err) { setMfaError(err.message); return; }
    const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: data.id });
    if (chalErr) { setMfaError(chalErr.message); return; }
    setQrCode(data.totp.qr_code); setSecret(data.totp.secret);
    setFactorId(data.id); setChallengeId(chal.id); setEnrolling(true);
  }

  async function confirmEnroll() {
    setMfaError('');
    const { error: err } = await supabase.auth.mfa.verify({
      factorId, challengeId, code: verifyCode.replace(/\s/g, ''),
    });
    if (err) { setMfaError('Código incorrecto. Intentá de nuevo.'); return; }
    setEnrolling(false); setQrCode(null); setSecret(null);
    setFactorId(null); setChallengeId(null); setVerifyCode('');
    showToast('2FA activado correctamente.'); loadFactors();
  }

  async function cancelEnroll() {
    if (factorId) await supabase.auth.mfa.unenroll({ factorId });
    setEnrolling(false); setQrCode(null); setSecret(null);
    setFactorId(null); setChallengeId(null); setVerifyCode(''); setMfaError('');
  }

  async function unenroll(fId) {
    setUnenrolling(true);
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: fId });
    if (err) { setMfaError(err.message); setUnenrolling(false); return; }
    showToast('2FA desactivado.'); loadFactors(); setUnenrolling(false);
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
    setInvEmail(''); setInvError(''); setInvLink(''); setInvModal(true);
  }

  async function sendInvite() {
    setInvError(''); setInvLink('');
    if (!invEmail.trim()) { setInvError('El email es obligatorio.'); return; }
    setInvSaving(true);
    try {
      const r = await authFetch('/api/invitaciones', { method: 'POST', body: JSON.stringify({ email: invEmail }) });
      const d = await r.json();
      if (!r.ok) { setInvError(d.error || 'Error al enviar.'); setInvSaving(false); return; }
      if (!d.sent) setInvLink(d.link); // show link if email not sent
      else { setInvModal(false); showToast(`Invitación enviada a ${invEmail}`); }
    } catch { setInvError('Error de conexión.'); }
    setInvSaving(false);
  }

  // ── Utils ─────────────────────────────────────────────────────────────────
  function showToast(msg, isErr = false) {
    setToast({ msg, isErr }); setTimeout(() => setToast(null), 3500);
  }

  const initials = (user?.user_metadata?.name || user?.email || 'U').slice(0, 2).toUpperCase();

  if (user === undefined || user === null) {
    return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font, color: C.muted, fontSize: 14 }}>Cargando…</div>;
  }

  const verified2FA = factors.filter(f => f.status === 'verified');
  const isAdmin = rol === 'admin';

  return (
    <>
      <Head><title>Configuración — CIA</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};color:${C.text};font-family:${C.font};min-height:100vh;}
        input,button{font-family:${C.font};}
        .menu-item:hover{background:#f5f7fa;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── TOPBAR ── */}
      <header style={{ background: C.navy, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
              <rect x="8" y="4" width="30" height="38" rx="3" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="2"/>
              <path d="M15 15h16M15 22h12M15 29h14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="39" cy="40" r="12" fill={C.accent}/>
              <path d="M33 40l4.5 4.5L46 34" stroke={C.navy} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 20, letterSpacing: '2px' }}>CIA</span>
          </Link>
        </div>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '6px 12px 6px 8px', color: 'white', cursor: 'pointer' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.navy }}>
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
                <Link href="/" onClick={() => setMenu(false)} className="menu-item"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: C.text, textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke={C.muted} strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1" stroke={C.muted} strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1" stroke={C.muted} strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1" stroke={C.muted} strokeWidth="1.3"/></svg>
                  Dashboard
                </Link>
                <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
                <button onClick={() => signOut().then(() => router.replace('/login'))} className="menu-item"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.red, fontWeight: 600, textAlign: 'left' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 10l3-3-3-3M12 7H5M5 2H2v10h3" stroke={C.red} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, fontSize: 13 }}>
          <Link href="/" style={{ color: C.muted, textDecoration: 'none', fontWeight: 500 }}>Inicio</Link>
          <span style={{ color: C.border }}>›</span>
          <span style={{ color: C.text, fontWeight: 600 }}>Configuración</span>
        </div>

        {/* ── Access denied for operadores ── */}
        {!dataLoading && rol === 'operador' && (
          <div style={{ ...card, padding: 32, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Acceso restringido</div>
            <div style={{ fontSize: 14, color: C.muted }}>Solo el admin del estudio puede acceder a esta sección.</div>
          </div>
        )}

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
        <section style={{ marginBottom: 20 }}>
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

        {/* ── 2FA ── */}
        <section>
          <div style={{ ...card, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Verificación en dos pasos (2FA)</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Protegé tu cuenta con Google Authenticator, Authy u otra app TOTP</div>
              </div>
              {!loadingF && (
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: verified2FA.length > 0 ? '#dcfce7' : '#f1f5f9', color: verified2FA.length > 0 ? C.green : C.muted }}>
                  {verified2FA.length > 0 ? 'Activado' : 'Desactivado'}
                </span>
              )}
            </div>

            {loadingF ? (
              <div style={{ color: C.muted, fontSize: 13 }}>Cargando…</div>
            ) : enrolling ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ background: '#e8f3fd', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 12 }}>1. Escaneá este código QR con tu app</div>
                  {qrCode && <img src={qrCode} alt="QR 2FA" style={{ display: 'block', width: 180, height: 180, margin: '0 auto 12px', borderRadius: 8 }} />}
                  {secret && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>O ingresá el código manual:</div>
                      <code style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 13, letterSpacing: '0.08em', color: C.navy, fontWeight: 700 }}>{secret}</code>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>2. Ingresá el código de 6 dígitos para confirmar</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Código TOTP</label>
                      <input value={verifyCode} onChange={e => setVerifyCode(e.target.value)}
                        placeholder="123 456" maxLength={7} style={inp} autoFocus />
                    </div>
                    <button onClick={confirmEnroll}
                      style={{ padding: '9px 20px', background: C.navy, color: 'white', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Verificar y activar
                    </button>
                  </div>
                  {mfaError && <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 14px', fontSize: 13, color: C.red }}>{mfaError}</div>}
                </div>
                <button onClick={cancelEnroll}
                  style={{ alignSelf: 'flex-start', background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '7px 16px', fontSize: 13, color: C.muted, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            ) : verified2FA.length > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 38, height: 38, background: '#dcfce7', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9l4 4 6-7" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Autenticador TOTP configurado</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Tu cuenta está protegida con 2FA</div>
                  </div>
                </div>
                {mfaError && <div style={{ marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 14px', fontSize: 13, color: C.red }}>{mfaError}</div>}
                <button onClick={() => unenroll(verified2FA[0].id)} disabled={unenrolling}
                  style={{ padding: '8px 18px', background: 'none', border: '1px solid #fecaca', borderRadius: 7, fontSize: 13, color: C.red, fontWeight: 600, cursor: unenrolling ? 'not-allowed' : 'pointer', opacity: unenrolling ? 0.6 : 1 }}>
                  {unenrolling ? 'Desactivando…' : 'Desactivar 2FA'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                  Con el 2FA activado necesitás un código de tu app de autenticación cada vez que iniciés sesión.
                </p>
                {mfaError && <div style={{ marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 14px', fontSize: 13, color: C.red }}>{mfaError}</div>}
                <button onClick={startEnroll}
                  style={{ padding: '9px 20px', background: C.navy, color: 'white', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Activar 2FA
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

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
                <input value={editForm.cuit} onChange={e => setEditForm(f => ({ ...f, cuit: e.target.value }))} placeholder="20-12345678-9" style={inp} />
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
        <div onClick={() => setInvModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', animation: 'slideUp 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Invitar empleado</div>
              <button onClick={() => setInvModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                Le llegará un email con un link para unirse al estudio como <strong>operador</strong>.
              </p>
              <div>
                <label style={lbl}>Email del empleado <span style={{ color: C.red }}>*</span></label>
                <input value={invEmail} onChange={e => setInvEmail(e.target.value)}
                  type="email" placeholder="empleado@empresa.com" style={inp} autoFocus
                  onKeyDown={e => e.key === 'Enter' && sendInvite()} />
              </div>
              {invError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 14px', fontSize: 13, color: C.red }}>{invError}</div>}
              {invLink && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 6 }}>Email no enviado — copiá el link manualmente:</div>
                  <div style={{ fontSize: 11, color: C.text, wordBreak: 'break-all', fontFamily: "'Courier New',monospace", background: C.white, padding: '6px 10px', borderRadius: 5, border: `1px solid ${C.border}` }}>{invLink}</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setInvModal(false)} style={{ background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '8px 18px', fontSize: 13, color: C.muted, cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
              <button onClick={sendInvite} disabled={invSaving} style={{ background: invSaving ? '#94a3b8' : C.navy, border: 'none', borderRadius: 7, padding: '8px 22px', fontSize: 13, color: 'white', fontWeight: 600, cursor: invSaving ? 'not-allowed' : 'pointer' }}>
                {invSaving ? 'Enviando…' : 'Enviar invitación'}
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
