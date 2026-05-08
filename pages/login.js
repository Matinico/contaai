import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
};

function LogoCIA() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="4" width="30" height="38" rx="3" fill={C.white} stroke={C.navy} strokeWidth="2"/>
        <path d="M15 15h16M15 22h12M15 29h14" stroke={C.navy} strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="39" cy="40" r="12" fill={C.accent}/>
        <path d="M33 40l4.5 4.5L46 34" stroke={C.white} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ fontSize: 30, fontWeight: 800, color: C.navy, letterSpacing: '2px', marginTop: 10, lineHeight: 1 }}>CIA</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Tu estudio ahora es inteligente</div>
    </div>
  );
}

// modes: login | register | verify-email | email-otp | totp
export default function Login() {
  const router = useRouter();

  const [mode,        setMode]        = useState('login');
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [otpDigits,   setOtpDigits]   = useState(Array(8).fill(''));
  const [totp,        setTotp]        = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [factorId,    setFactorId]    = useState(null);
  const [challengeId, setChallengeId] = useState(null);
  const [retryAfter,  setRetryAfter]  = useState(0);

  const otpRefs = useRef([]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const t = setTimeout(() => setRetryAfter(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [retryAfter]);

  function switchMode(m) {
    setMode(m); setError(''); setRetryAfter(0);
    setName(''); setEmail(''); setPassword(''); setConfirm('');
    setOtpDigits(Array(8).fill('')); setTotp('');
  }

  function getOtpValue() {
    return otpDigits.join('');
  }

  function handleOtpDigit(i, val) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[i] = digit;
    setOtpDigits(next);
    if (digit && i < 7) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpKeyDown(i, e) {
    if (e.key === 'Backspace') {
      if (otpDigits[i]) {
        const next = [...otpDigits];
        next[i] = '';
        setOtpDigits(next);
      } else if (i > 0) {
        otpRefs.current[i - 1]?.focus();
      }
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    const next = Array(8).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    const nextFocus = Math.min(pasted.length, 7);
    otpRefs.current[nextFocus]?.focus();
  }

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim())         { setError('El nombre es obligatorio.'); return; }
      if (password.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
      if (password !== confirm)  { setError('Las contraseñas no coinciden.'); return; }
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
        await supabase.auth.signOut();
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

      if (mode === 'email-otp') {
        const { error: err } = await supabase.auth.verifyOtp({
          email,
          token: getOtpValue(),
          type: 'email',
        });
        if (err) {
          setError('Código incorrecto o expirado. Pedí uno nuevo.');
          setLoading(false);
          return;
        }
        router.replace('/');
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        const msg = signInErr.message?.toLowerCase() ?? '';
        if (msg.includes('not confirmed') || signInErr.code === 'email_not_confirmed') {
          setError('Confirmá tu email antes de ingresar. Revisá tu casilla de correo.');
        } else {
          setError('Email o contraseña incorrectos.');
        }
        setLoading(false);
        return;
      }

      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');

      if (totpFactor) {
        const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
        if (chalErr) { setError('Error al iniciar verificación 2FA.'); setLoading(false); return; }
        setFactorId(totpFactor.id);
        setChallengeId(chal.id);
        setMode('totp');
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpErr) {
        const msg = otpErr.message?.toLowerCase() ?? '';
        if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('after') || msg.includes('security purposes')) {
          const match = otpErr.message?.match(/(\d+)\s*second/i);
          const secs = match ? parseInt(match[1], 10) : 60;
          setRetryAfter(secs);
          setError(`Demasiados intentos. Esperá ${secs} segundos antes de volver a intentar.`);
        } else if (msg.includes('not found') || msg.includes('no user')) {
          setError('No encontramos una cuenta con ese email.');
        } else {
          setError(otpErr.message || 'Error al enviar el código. Intentá de nuevo.');
        }
        setLoading(false);
        return;
      }
      setMode('email-otp');
      setLoading(false);

    } catch {
      setError('Error de conexión. Intentá de nuevo.');
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setError('');
    setOtpDigits(Array(8).fill(''));
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (err) setError('Error al reenviar el código.');
    else otpRefs.current[0]?.focus();
  };

  const isLogin = mode === 'login';

  const globalStyle = `
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:${C.bg};font-family:${C.font};min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
    input,button{font-family:${C.font};}
    .inp{width:100%;border:1.5px solid ${C.border};border-radius:8px;padding:11px 14px;font-size:14px;color:${C.text};outline:none;background:${C.white};transition:border-color 0.15s;}
    .inp:focus{border-color:${C.navy};}
    .inp::placeholder{color:#b0b8c4;}
    @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  `;

  // ── Verify email post-register ────────────────────────────────────────────
  if (mode === 'verify-email') {
    return (
      <>
        <Head><title>CIA — Verificar email</title></Head>
        <style>{globalStyle}</style>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn 0.25s ease' }}>
          <LogoCIA />
          <div style={card}>
            <div style={{ textAlign: 'center' }}>
              <div style={iconCircle}>
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <rect x="2" y="5" width="22" height="16" rx="2.5" stroke={C.navy} strokeWidth="1.8"/>
                  <path d="M2 8l11 7.5L24 8" stroke={C.navy} strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Verificá tu email</h2>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
                Te enviamos un enlace a <strong style={{ color: C.text }}>{email}</strong>.<br />
                Hacé clic en él para activar tu cuenta.
              </p>
              <button onClick={() => switchMode('login')} style={btnPrimary(false)}>
                Ir al login
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>CIA — {
          mode === 'email-otp' ? 'Verificación 2FA' :
          mode === 'totp'      ? 'Verificación 2FA' :
          isLogin              ? 'Iniciar sesión' : 'Crear cuenta'
        }</title>
      </Head>
      <style>{globalStyle}</style>

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn 0.25s ease' }}>
        <LogoCIA />

        <div style={card}>

          {/* ── OTP por email ── */}
          {mode === 'email-otp' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={iconCircle}>
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <rect x="2" y="5" width="22" height="16" rx="2.5" stroke={C.navy} strokeWidth="1.8"/>
                    <path d="M2 8l11 7.5L24 8" stroke={C.navy} strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Verificá tu identidad</h2>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                  Te enviamos un código de 8 dígitos a<br />
                  <strong style={{ color: C.text }}>{email}</strong>
                </p>
              </div>

              {/* 8 individual OTP inputs */}
              <div style={{ display: 'flex', gap: 7, justifyContent: 'center' }} onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    value={digit}
                    onChange={e => handleOtpDigit(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    maxLength={1}
                    inputMode="numeric"
                    autoFocus={i === 0}
                    style={{
                      width: 40, height: 50,
                      textAlign: 'center',
                      fontSize: 20, fontWeight: 700,
                      border: `1.5px solid ${digit ? C.navy : C.border}`,
                      borderRadius: 8,
                      outline: 'none',
                      color: C.text,
                      background: C.white,
                      fontFamily: C.font,
                      transition: 'border-color 0.15s',
                    }}
                  />
                ))}
              </div>

              {error && <ErrorBox msg={error} />}

              <button type="submit" disabled={loading} style={btnPrimary(loading)}>
                {loading ? 'Verificando…' : 'Verificar y entrar'}
              </button>

              <div style={{ textAlign: 'center', fontSize: 13, color: C.muted }}>
                ¿No llegó?{' '}
                <button type="button" onClick={resendOtp} style={btnLink}>
                  Reenviar código
                </button>
              </div>
            </form>
          )}

          {/* ── TOTP (Google Authenticator) ── */}
          {mode === 'totp' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={iconCircle}>
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <rect x="6" y="2" width="14" height="22" rx="2.5" stroke={C.navy} strokeWidth="1.8"/>
                    <circle cx="13" cy="19" r="1.5" fill={C.navy}/>
                    <path d="M10 7h6" stroke={C.navy} strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Verificá tu identidad</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Ingresá el código de Google Authenticator o Authy</p>
              </div>
              <div>
                <label style={lbl}>Código TOTP</label>
                <input className="inp" value={totp} onChange={e => setTotp(e.target.value)}
                  placeholder="123456" maxLength={6} autoFocus
                  style={{ textAlign: 'center', fontSize: 22, letterSpacing: '0.3em', fontWeight: 700 }} />
              </div>
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading} style={btnPrimary(loading)}>
                {loading ? 'Verificando…' : 'Verificar y entrar'}
              </button>
            </form>
          )}

          {/* ── Login / Registro ── */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {!isLogin && (
                <div>
                  <label style={lbl}>Nombre</label>
                  <input className="inp" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre completo" required />
                </div>
              )}

              <div>
                <label style={lbl}>Email</label>
                <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com" required />
              </div>

              <div>
                <label style={lbl}>Contraseña</label>
                <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required />
              </div>

              {!isLogin && (
                <div>
                  <label style={lbl}>Confirmar contraseña</label>
                  <input className="inp" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••" required />
                </div>
              )}

              {error && <ErrorBox msg={error} />}

              <button type="submit" disabled={loading || retryAfter > 0} style={{ ...btnPrimary(loading || retryAfter > 0), marginTop: 4 }}>
                {loading ? 'Procesando…' : retryAfter > 0 ? `Esperá ${retryAfter}s…` : isLogin ? 'Ingresar' : 'Crear cuenta'}
              </button>
            </form>
          )}

          {/* Switch mode */}
          {(mode === 'login' || mode === 'register') && (
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: C.muted }}>
              {isLogin ? (
                <>¿No tenés cuenta?{' '}
                  <button onClick={() => switchMode('register')} style={btnLink}>
                    Registrate
                  </button>
                </>
              ) : (
                <>¿Ya tenés cuenta?{' '}
                  <button onClick={() => switchMode('login')} style={btnLink}>
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

function ErrorBox({ msg }) {
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.red }}>
      {msg}
    </div>
  );
}

const card = {
  background: C.white,
  borderRadius: 14,
  padding: '32px 32px 28px',
  boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
};

const iconCircle = {
  width: 52, height: 52,
  background: '#e8f3fd',
  borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  margin: '0 auto 14px',
};

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#5a6a7a', marginBottom: 6 };

const btnLink = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: C.navy, fontWeight: 600, fontSize: 13, padding: 0,
};

function btnPrimary(loading) {
  return {
    width: '100%', padding: '12px',
    background: loading ? '#94a3b8' : C.navy,
    color: C.white,
    border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  };
}
