import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../lib/auth-context';
import { authFetch } from '../lib/auth-fetch';
import { supabase } from '../lib/supabase-browser';

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

function LogoCIA() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <svg width="48" height="48" viewBox="0 0 56 56" fill="none">
        <rect x="8" y="4" width="30" height="38" rx="3" fill={C.white} stroke={C.navy} strokeWidth="2"/>
        <path d="M15 15h16M15 22h12M15 29h14" stroke={C.navy} strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="39" cy="40" r="12" fill={C.accent}/>
        <path d="M33 40l4.5 4.5L46 34" stroke={C.white} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.navy, letterSpacing: '2px', marginTop: 8 }}>CIA</div>
    </div>
  );
}

export default function Invitacion() {
  const router       = useRouter();
  const { user }     = useAuth();
  const { token }    = router.query;

  const [inv,      setInv]      = useState(null);   // { email, estudio_nombre }
  const [invError, setInvError] = useState('');
  const [loading,  setLoading]  = useState(true);

  // Form state (new user)
  const [nombre,   setNombre]   = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  // Load invitation details
  useEffect(() => {
    if (!token) return;
    fetch(`/api/invitaciones?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setInvError(d.error);
        else { setInv(d); setNombre(''); }
      })
      .catch(() => setInvError('Error al cargar la invitación.'))
      .finally(() => setLoading(false));
  }, [token]);

  // Accept as authenticated user
  async function acceptAuthenticated() {
    setSaving(true); setError('');
    try {
      const r = await authFetch('/api/invitaciones/aceptar', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error); setSaving(false); return; }
      setDone(true);
      setTimeout(() => router.replace('/dashboard'), 2000);
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
      setSaving(false);
    }
  }

  // Accept as new user
  async function acceptNewUser(e) {
    e.preventDefault();
    setError('');
    if (!nombre.trim())    { setError('El nombre es obligatorio.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }

    setSaving(true);
    try {
      const r = await fetch('/api/invitaciones/aceptar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nombre, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        // Already exists → switch to login mode by telling user
        if (r.status === 409) {
          setError(data.error);
        } else {
          setError(data.error || 'Error al crear la cuenta.');
        }
        setSaving(false);
        return;
      }
      // Auto-login after account creation
      await supabase.auth.signInWithPassword({ email: inv.email, password });
      setDone(true);
      setTimeout(() => router.replace('/dashboard'), 2000);
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
      setSaving(false);
    }
  }

  const globalStyle = `
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:${C.bg};font-family:${C.font};min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
    input,button{font-family:${C.font};}
    .inp{width:100%;border:1.5px solid ${C.border};border-radius:8px;padding:11px 14px;font-size:14px;color:${C.text};outline:none;background:${C.white};transition:border-color 0.15s;}
    .inp:focus{border-color:${C.navy};}
    .inp::placeholder{color:#b0b8c4;}
    @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  `;

  if (loading || !token) {
    return (
      <>
        <style>{globalStyle}</style>
        <div style={{ color: C.muted, fontSize: 14, fontFamily: C.font }}>Cargando invitación…</div>
      </>
    );
  }

  if (invError) {
    return (
      <>
        <Head><title>CIA — Invitación</title></Head>
        <style>{globalStyle}</style>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <LogoCIA />
          <div style={{ background: C.white, borderRadius: 14, padding: '32px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Invitación inválida</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{invError}</div>
            <button onClick={() => router.push('/login')} style={btnPrimary(false)}>
              Ir al inicio
            </button>
          </div>
        </div>
      </>
    );
  }

  if (done) {
    return (
      <>
        <Head><title>CIA — Bienvenido</title></Head>
        <style>{globalStyle}</style>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <LogoCIA />
          <div style={{ background: C.white, borderRadius: 14, padding: '32px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 12l6 6L20 6" stroke={C.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>¡Te uniste al estudio!</div>
            <div style={{ fontSize: 14, color: C.muted }}>Redirigiendo al dashboard…</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>CIA — Invitación</title></Head>
      <style>{globalStyle}</style>

      <div style={{ width: '100%', maxWidth: 440, animation: 'fadeIn 0.25s ease' }}>
        <LogoCIA />

        <div style={{ background: C.white, borderRadius: 14, padding: '32px 32px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-block', background: '#e8f3fd', borderRadius: 10, padding: '8px 18px', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 12 }}>
              {inv.estudio_nombre}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Te invitaron a unirte</h2>
            <p style={{ fontSize: 13, color: C.muted }}>
              Para <strong style={{ color: C.text }}>{inv.email}</strong>
            </p>
          </div>

          {/* ── Already logged in ── */}
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f8f9fb', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 1.5 }}>
                Estás ingresado como <strong style={{ color: C.text }}>{user.email}</strong>
              </div>
              {error && <ErrorBox msg={error} />}
              <button onClick={acceptAuthenticated} disabled={saving} style={btnPrimary(saving)}>
                {saving ? 'Procesando…' : 'Aceptar invitación'}
              </button>
            </div>
          ) : (
            /* ── New user form ── */
            <form onSubmit={acceptNewUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Nombre completo <span style={{ color: C.red }}>*</span></label>
                <input className="inp" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre completo" autoFocus />
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input className="inp" value={inv.email} readOnly
                  style={{ background: '#f8f9fb', color: C.muted, cursor: 'default' }} />
              </div>
              <div>
                <label style={lbl}>Contraseña <span style={{ color: C.red }}>*</span></label>
                <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" />
              </div>
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={saving} style={btnPrimary(saving)}>
                {saving ? 'Creando cuenta…' : 'Unirme al estudio'}
              </button>
              <div style={{ textAlign: 'center', fontSize: 13, color: C.muted }}>
                ¿Ya tenés cuenta?{' '}
                <button type="button" onClick={() => router.push(`/login?redirect=/invitacion?token=${token}`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.navy, fontWeight: 600, fontSize: 13, padding: 0 }}>
                  Iniciá sesión
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.red }}>
      {msg}
    </div>
  );
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#5a6a7a', marginBottom: 6 };

function btnPrimary(loading) {
  return {
    width: '100%', padding: '12px',
    background: loading ? '#94a3b8' : C.navy,
    color: C.white, border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  };
}
