import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase-browser';

const FONT = "Arial, sans-serif";

const C = {
  navy:   '#1a3a5c',
  blue:   '#2563eb',
  white:  '#ffffff',
  text:   '#1e293b',
  muted:  '#64748b',
  border: '#e2e8f0',
  red:    '#dc2626',
  bg:     '#f8fafc',
};

// ── Left column — marketing panel ─────────────────────────────────────────────
function LeftPanel() {
  const checks = [
    'Lectura automática con IA',
    'Libro IVA digital',
    'Exportación TXT compatible con ARCA',
  ];
  return (
    <div style={{
      width: '45%', minHeight: '100vh', background: C.navy,
      display: 'flex', flexDirection: 'column', padding: '40px 48px',
      fontFamily: FONT,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
        <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
          <rect x="8" y="4" width="30" height="38" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/>
          <path d="M15 15h16M15 22h12M15 29h14" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="39" cy="40" r="12" fill="#7eb8f7"/>
          <path d="M33 40l4.5 4.5L46 34" stroke={C.navy} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 20, color: C.white, letterSpacing: '2px' }}>CIA</span>
      </div>

      {/* Hero text — centered vertically */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 40 }}>
        <h1 style={{
          fontFamily: FONT, fontSize: 36, fontWeight: 800, color: C.white,
          lineHeight: 1.2, marginBottom: 20, letterSpacing: '-0.5px',
        }}>
          Tu estudio,<br />potenciado por IA.
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 340 }}>
          CIA automatiza la lectura de facturas, el armado del libro IVA y la generación del TXT para ARCA.
        </p>
      </div>

      {/* Bullets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {checks.map(text => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke={C.white} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// modes: login | register | verify-email
export default function Login() {
  const router = useRouter();

  const [mode,     setMode]     = useState('login');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  function switchMode(m) {
    setMode(m); setError('');
    setName(''); setEmail(''); setPassword(''); setConfirm('');
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
        const r = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: name.trim() }),
        });
        const body = await r.json();
        if (!r.ok) {
          setError(r.status === 409
            ? 'Este email ya está registrado. Intentá iniciar sesión.'
            : body.error || 'Error al crear la cuenta.');
          setLoading(false);
          return;
        }
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setError('Cuenta creada, pero no se pudo iniciar sesión automáticamente. Intentá ingresar manualmente.');
          setLoading(false);
          return;
        }
        router.replace('/dashboard');
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

      router.replace('/dashboard');

    } catch {
      setError('Error de conexión. Intentá de nuevo.');
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  const globalStyle = `
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:${FONT};min-height:100vh;}
    input,button{font-family:${FONT};}
    .inp{width:100%;border:1.5px solid ${C.border};border-radius:8px;padding:11px 14px;font-size:14px;color:${C.text};outline:none;background:${C.white};transition:border-color 0.15s;}
    .inp:focus{border-color:${C.navy};}
    .inp::placeholder{color:#b0b8c4;}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  `;

  // ── Verify email ──────────────────────────────────────────────────────────
  if (mode === 'verify-email') {
    return (
      <>
        <Head><title>CIA — Verificar email</title></Head>
        <style>{globalStyle}</style>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <LeftPanel />
          <div style={{
            flex: 1, background: C.white, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 40,
          }}>
            <div style={{ maxWidth: 380, width: '100%', textAlign: 'center', animation: 'fadeIn 0.25s ease' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: '#e8f3fd',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2.5" stroke={C.navy} strokeWidth="1.7"/>
                  <path d="M2 7l10 7 10-7" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 10 }}>Verificá tu email</h2>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 28 }}>
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

  // ── Login / Register ──────────────────────────────────────────────────────
  return (
    <>
      <Head><title>CIA — {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</title></Head>
      <style>{globalStyle}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <LeftPanel />

        {/* Right column */}
        <div style={{
          flex: 1, background: C.white,
          display: 'flex', flexDirection: 'column',
          padding: '32px 40px',
        }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link href="/" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, color: C.muted,
              textDecoration: 'none', padding: '6px 0',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Volver al inicio
            </Link>
          </div>

          {/* Form — centered */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: '100%', maxWidth: 380, animation: 'fadeIn 0.25s ease' }}>

              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                  Ingresá a CIA
                </h2>
                <p style={{ fontSize: 14, color: C.muted }}>
                  {isLogin ? 'Accedé a tu estudio contable' : 'Creá tu cuenta para empezar'}
                </p>
              </div>

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

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.red }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{ ...btnPrimary(loading), marginTop: 4 }}>
                  {loading ? 'Procesando…' : isLogin ? 'Ingresar' : 'Crear cuenta'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: C.muted }}>
                {isLogin ? (
                  <>¿No tenés cuenta?{' '}
                    <button onClick={() => switchMode('register')} style={btnLink}>
                      Comenzar gratis
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
        </div>
      </div>
    </>
  );
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 };

const btnLink = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: C.navy, fontWeight: 700, fontSize: 13, padding: 0,
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
    fontFamily: FONT,
  };
}
