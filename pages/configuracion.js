import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

const C = {
  navy:   '#1a3a5c',
  navyLt: '#e8f0f7',
  bg:     '#f0f4f8',
  white:  '#ffffff',
  text:   '#1e293b',
  muted:  '#64748b',
  border: '#e2e8f0',
  green:  '#16a34a',
  red:    '#dc2626',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
};

const card = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const lbl  = { display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inp  = { width: '100%', background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', color: C.text, fontSize: 14, outline: 'none', fontFamily: C.font };

export default function Configuracion() {
  const { user, signOut, supabase } = useAuth();
  const router = useRouter();
  const menuRef = useRef(null);

  const [menu,        setMenu]        = useState(false);
  const [factors,     setFactors]     = useState([]);
  const [loadingF,    setLoadingF]    = useState(true);
  const [enrolling,   setEnrolling]   = useState(false);
  const [qrCode,      setQrCode]      = useState(null);
  const [secret,      setSecret]      = useState(null);
  const [factorId,    setFactorId]    = useState(null);
  const [challengeId, setChallengeId] = useState(null);
  const [verifyCode,  setVerifyCode]  = useState('');
  const [unenrolling, setUnenrolling] = useState(false);
  const [error,       setError]       = useState('');
  const [toast,       setToast]       = useState(null);

  useEffect(() => { if (user === null) router.replace('/login'); }, [user, router]);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (user) loadFactors();
  }, [user]);

  async function loadFactors() {
    setLoadingF(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
    setLoadingF(false);
  }

  async function startEnroll() {
    setError('');
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (err) { setError(err.message); return; }
    const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: data.id });
    if (chalErr) { setError(chalErr.message); return; }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setChallengeId(chal.id);
    setEnrolling(true);
  }

  async function confirmEnroll() {
    setError('');
    const { error: err } = await supabase.auth.mfa.verify({
      factorId, challengeId, code: verifyCode.replace(/\s/g, ''),
    });
    if (err) { setError('Código incorrecto. Intentá de nuevo.'); return; }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setChallengeId(null);
    setVerifyCode('');
    showToast('2FA activado correctamente.');
    loadFactors();
  }

  async function cancelEnroll() {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setChallengeId(null);
    setVerifyCode('');
    setError('');
  }

  async function unenroll(fId) {
    setUnenrolling(true);
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: fId });
    if (err) { setError(err.message); setUnenrolling(false); return; }
    showToast('2FA desactivado.');
    loadFactors();
    setUnenrolling(false);
  }

  function showToast(msg, isErr = false) {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 3500);
  }

  if (user === undefined || user === null) {
    return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font, color: C.muted }}>Cargando…</div>;
  }

  const verified2FA = factors.filter(f => f.status === 'verified');

  return (
    <>
      <Head><title>Configuración — CIA</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};color:${C.text};font-family:${C.font};min-height:100vh;}
        input,button{font-family:${C.font};}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
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
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500 }}>Configuración</span>
        </div>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, padding: '6px 12px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {(user?.email || 'U')[0].toUpperCase()}
            </div>
            <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
              {user?.user_metadata?.name || user?.email}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>

          {menu && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, width: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', animation: 'fadeIn 0.15s ease', zIndex: 100 }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.muted }}>{user?.email}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{user?.user_metadata?.name || '—'}</div>
              </div>
              <div style={{ padding: '8px 0' }}>
                <Link href="/" onClick={() => setMenu(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', fontSize: 13, color: C.text, textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke={C.muted} strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1" stroke={C.muted} strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1" stroke={C.muted} strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1" stroke={C.muted} strokeWidth="1.3"/></svg>
                  Dashboard de clientes
                </Link>
                <button onClick={() => signOut().then(() => router.replace('/login'))}
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
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 13, textDecoration: 'none', marginBottom: 28, fontWeight: 500 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8 10l-3-3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Volver al dashboard
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 32 }}>Configuración de cuenta</h1>

        {/* Perfil */}
        <div style={{ ...card, padding: '24px', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Información de cuenta</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={lbl}>Nombre</div>
              <div style={{ fontSize: 14, color: C.text }}>{user?.user_metadata?.name || '—'}</div>
            </div>
            <div>
              <div style={lbl}>Email</div>
              <div style={{ fontSize: 14, color: C.text }}>{user?.email}</div>
            </div>
          </div>
        </div>

        {/* 2FA */}
        <div style={{ ...card, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Verificación en dos pasos (2FA)</div>
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
            /* Enroll flow */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ background: C.navyLt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 12 }}>
                  1. Escaneá este código QR con tu app de autenticación
                </div>
                {qrCode && (
                  <img src={qrCode} alt="QR Code 2FA" style={{ display: 'block', width: 180, height: 180, margin: '0 auto 12px', borderRadius: 8 }} />
                )}
                {secret && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>O ingresá el código manual:</div>
                    <code style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 13, letterSpacing: '0.08em', color: C.navy, fontWeight: 700 }}>{secret}</code>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>
                  2. Ingresá el código de 6 dígitos para confirmar
                </div>
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
                {error && (
                  <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 14px', fontSize: 13, color: C.red }}>
                    {error}
                  </div>
                )}
              </div>
              <button onClick={cancelEnroll}
                style={{ alignSelf: 'flex-start', background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 16px', fontSize: 13, color: C.muted, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          ) : verified2FA.length > 0 ? (
            /* Already enrolled */
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
              {error && (
                <div style={{ marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 14px', fontSize: 13, color: C.red }}>
                  {error}
                </div>
              )}
              <button onClick={() => unenroll(verified2FA[0].id)} disabled={unenrolling}
                style={{ padding: '8px 18px', background: 'none', border: `1px solid #fecaca`, borderRadius: 7, fontSize: 13, color: C.red, fontWeight: 600, cursor: unenrolling ? 'not-allowed' : 'pointer', opacity: unenrolling ? 0.6 : 1 }}>
                {unenrolling ? 'Desactivando…' : 'Desactivar 2FA'}
              </button>
            </div>
          ) : (
            /* Not enrolled */
            <div>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Con el 2FA activado, además de tu contraseña vas a necesitar un código de tu app de autenticación cada vez que iniciés sesión.
              </p>
              {error && (
                <div style={{ marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 14px', fontSize: 13, color: C.red }}>
                  {error}
                </div>
              )}
              <button onClick={startEnroll}
                style={{ padding: '9px 20px', background: C.navy, color: 'white', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Activar 2FA
              </button>
            </div>
          )}
        </div>
      </div>

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
