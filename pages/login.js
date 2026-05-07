import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabase-browser';

const C = {
  navy:   '#1a3a5c',
  navyLt: '#e8f0f7',
  bg:     '#ffffff',
  text:   '#1e293b',
  muted:  '#64748b',
  border: '#e2e8f0',
  red:    '#dc2626',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
};

export default function Login() {
  const router = useRouter();

  const [mode,        setMode]        = useState('login'); // login | register | totp | verify-email
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [totp,        setTotp]        = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [factorId,    setFactorId]    = useState(null);
  const [challengeId, setChallengeId] = useState(null);

  function switchMode(m) {
    setMode(m); setError('');
    setName(''); setEmail(''); setPassword(''); setConfirm(''); setTotp('');
  }

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim())            { setError('El nombre es obligatorio.'); return; }
      if (password.length < 6)     { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
      if (password !== confirm)    { setError('Las contraseñas no coinciden.'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() } },
        });
        if (err) { setError(err.message); setLoading(false); return; }
        setMode('verify-email');
        setLoading(false);
        return;
      }

      if (mode === 'totp') {
        const { error: err } = await supabase.auth.mfa.verify({
          factorId, challengeId, code: totp.replace(/\s/g, ''),
        });
        if (err) { setError('Código incorrecto. Intentá de nuevo.'); setLoading(false); return; }
        router.replace('/');
        return;
      }

      // login
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setError('Email o contraseña incorrectos.');
        setLoading(false);
        return;
      }

      // Check MFA level
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.nextLevel === 'aal2' && aalData?.nextLevel !== aalData?.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];
        if (totpFactor) {
          const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
          if (chalErr) { setError('Error al iniciar verificación 2FA.'); setLoading(false); return; }
          setFactorId(totpFactor.id);
          setChallengeId(chal.id);
          setMode('totp');
          setLoading(false);
          return;
        }
      }

      router.replace('/');
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  if (mode === 'verify-email') {
    return (
      <>
        <Head><title>CIA — Verificar email</title></Head>
        <style>{`*{margin:0;padding:0;box-sizing:border-box;}body{background:${C.bg};font-family:${C.font};min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}`}</style>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: C.navyLt, borderRadius: 16, marginBottom: 20 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="6" width="22" height="16" rx="2" stroke={C.navy} strokeWidth="1.7"/>
              <path d="M3 8l11 8 11-8" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 10 }}>Verificá tu email</h2>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
            Te enviamos un enlace a <strong>{email}</strong>.<br />
            Hacé clic en él para activar tu cuenta y luego ingresá.
          </p>
          <button onClick={() => switchMode('login')} style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Ir al login
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>CIA — {mode === 'totp' ? 'Verificación 2FA' : isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};font-family:${C.font};min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
        input,button{font-family:${C.font};}
        .inp{width:100%;border:1px solid ${C.border};border-radius:8px;padding:10px 14px;font-size:14px;color:${C.text};outline:none;background:${C.bg};transition:border-color 0.15s;}
        .inp:focus{border-color:${C.navy};}
        .inp::placeholder{color:#94a3b8;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.25s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: C.navyLt, borderRadius: 16, marginBottom: 14 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="4" y="3" width="15" height="19" rx="2" stroke={C.navy} strokeWidth="1.7"/>
              <path d="M8 9h7M8 13h5M8 17h6" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="21" cy="21" r="6" fill={C.navyLt} stroke={C.navy} strokeWidth="1.5"/>
              <path d="M19 21l1.5 1.5L23 19" stroke={C.navy} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.navy, letterSpacing: '-0.02em' }}>CIA</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Contabilidad con Inteligencia Artificial</div>
        </div>

        {/* Card */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>

          {mode === 'totp' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Verificación de dos pasos</div>
                <div style={{ fontSize: 13, color: C.muted }}>Ingresá el código de tu app de autenticación</div>
              </div>
              <div>
                <label style={lbl}>Código TOTP <span style={{ color: C.red }}>*</span></label>
                <input className="inp" value={totp} onChange={e => setTotp(e.target.value)}
                  placeholder="123 456" maxLength={7} autoFocus />
              </div>
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.red }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} style={{ marginTop: 4, width: '100%', padding: '12px', background: loading ? '#94a3b8' : C.navy, color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Verificando…' : 'Verificar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {!isLogin && (
                <div>
                  <label style={lbl}>Nombre <span style={{ color: C.red }}>*</span></label>
                  <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre completo" required />
                </div>
              )}

              <div>
                <label style={lbl}>Email <span style={{ color: C.red }}>*</span></label>
                <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@empresa.com" required />
              </div>

              <div>
                <label style={lbl}>Contraseña <span style={{ color: C.red }}>*</span></label>
                <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>

              {!isLogin && (
                <div>
                  <label style={lbl}>Confirmar contraseña <span style={{ color: C.red }}>*</span></label>
                  <input className="inp" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
                </div>
              )}

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.red }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ marginTop: 4, width: '100%', padding: '12px', background: loading ? '#94a3b8' : C.navy, color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                {loading ? 'Procesando…' : isLogin ? 'Ingresar' : 'Crear cuenta'}
              </button>
            </form>
          )}

          {/* Switch mode */}
          {mode !== 'totp' && (
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: C.muted }}>
              {isLogin ? (
                <>¿No tenés cuenta?{' '}
                  <button onClick={() => switchMode('register')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.navy, fontWeight: 600, fontSize: 13, padding: 0 }}>
                    Registrate
                  </button>
                </>
              ) : (
                <>¿Ya tenés cuenta?{' '}
                  <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.navy, fontWeight: 600, fontSize: 13, padding: 0 }}>
                    Ingresá
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 };
