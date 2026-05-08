import { useState } from 'react';
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

// modes: login | register | verify-email
export default function Login() {
  const router = useRouter();

  const [mode,    setMode]    = useState('login');
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [password,setPassword]= useState('');
  const [confirm, setConfirm] = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(m) {
    setMode(m); setError('');
    setName(''); setEmail(''); setPassword(''); setConfirm('');
  }

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim())        { setError('El nombre es obligatorio.'); return; }
      if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
      if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
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

      // login
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

      router.replace('/');

    } catch {
      setError('Error de conexión. Intentá de nuevo.');
      setLoading(false);
    }
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

  // ── Verify email post-register ──────────────────────────────────────────
  if (mode === 'verify-email') {
    return (
      <>
        <Head><title>CIA — Verificar email</title></Head>
        <style>{globalStyle}</style>
        <div style={{ width: '100%', maxWidth: 480, animation: 'fadeIn 0.25s ease' }}>
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
      <Head><title>CIA — {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</title></Head>
      <style>{globalStyle}</style>

      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeIn 0.25s ease' }}>
        <LogoCIA />

        <div style={card}>
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

            <button type="submit" disabled={loading} style={{ ...btnPrimary(loading), marginTop: 4 }}>
              {loading ? 'Procesando…' : isLogin ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>

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

function btnPrimary(isLoading) {
  return {
    width: '100%', padding: '12px',
    background: isLoading ? '#94a3b8' : C.navy,
    color: C.white,
    border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700,
    cursor: isLoading ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  };
}
