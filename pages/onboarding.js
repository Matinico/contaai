import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
  red:    '#dc2626',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
};

function LogoCIA() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <rect x="8" y="4" width="30" height="38" rx="3" fill={C.white} stroke={C.navy} strokeWidth="2"/>
        <path d="M15 15h16M15 22h12M15 29h14" stroke={C.navy} strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="39" cy="40" r="12" fill={C.accent}/>
        <path d="M33 40l4.5 4.5L46 34" stroke={C.white} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ fontSize: 30, fontWeight: 800, color: C.navy, letterSpacing: '2px', marginTop: 10, lineHeight: 1 }}>CIA</div>
    </div>
  );
}

export default function Onboarding() {
  const { user } = useAuth();
  const router   = useRouter();

  const [step,    setStep]    = useState(1);
  const [nombre,  setNombre]  = useState('');
  const [telefono,setTelefono]= useState('');
  const [estudio, setEstudio] = useState('');
  const [cuit,    setCuit]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated; redirect to dashboard if already onboarded
  useEffect(() => {
    if (user === null) { router.replace('/login'); return; }
    if (!user) return;
    authFetch('/api/onboarding')
      .then(r => r.json())
      .then(d => { if (d.completed) router.replace('/'); })
      .catch(() => {});
  }, [user, router]);

  function handleStep1(e) {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) { setError('El nombre completo es obligatorio.'); return; }
    setStep(2);
  }

  async function handleStep2(e) {
    e.preventDefault();
    setError('');
    if (!estudio.trim()) { setError('El nombre del estudio es obligatorio.'); return; }
    if (!cuit.trim())    { setError('El CUIT del estudio es obligatorio.'); return; }

    setLoading(true);
    try {
      const r = await authFetch('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({ nombre, telefono, estudio_nombre: estudio, estudio_cuit: cuit }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Error al guardar. Intentá de nuevo.'); return; }
      router.replace('/');
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font, color: C.muted, fontSize: 14 }}>
        Cargando…
      </div>
    );
  }

  return (
    <>
      <Head><title>CIA — Configurar mi estudio</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};font-family:${C.font};min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
        input,button{font-family:${C.font};}
        .inp{width:100%;border:1.5px solid ${C.border};border-radius:8px;padding:11px 14px;font-size:14px;color:${C.text};outline:none;background:${C.white};transition:border-color 0.15s;}
        .inp:focus{border-color:${C.navy};}
        .inp::placeholder{color:#b0b8c4;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ width: '100%', maxWidth: 440, animation: 'fadeIn 0.25s ease' }}>
        <LogoCIA />

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
          {[1, 2].map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: step >= n ? C.navy : C.border,
                color: step >= n ? C.white : C.muted,
                transition: 'all 0.2s',
              }}>{n}</div>
              {n < 2 && <div style={{ width: 40, height: 2, background: step > 1 ? C.navy : C.border, borderRadius: 1, transition: 'background 0.3s' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: C.white, borderRadius: 14, padding: '32px 32px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>

          {/* ── PASO 1 ── */}
          {step === 1 && (
            <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Contanos sobre vos</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Paso 1 de 2 — Solo tarda un minuto.</p>
              </div>

              <div>
                <label style={lbl}>Nombre completo <span style={{ color: C.red }}>*</span></label>
                <input className="inp" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Martín García" autoFocus />
              </div>

              <div>
                <label style={lbl}>Teléfono <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span></label>
                <input className="inp" type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                  placeholder="+54 9 11 1234-5678" />
              </div>

              {error && <ErrorBox msg={error} />}

              <button type="submit" style={btnPrimary(false)}>
                Siguiente →
              </button>
            </form>
          )}

          {/* ── PASO 2 ── */}
          {step === 2 && (
            <form onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Datos de tu estudio contable</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Paso 2 de 2 — Podés modificarlos más adelante.</p>
              </div>

              <div>
                <label style={lbl}>Nombre del estudio <span style={{ color: C.red }}>*</span></label>
                <input className="inp" value={estudio} onChange={e => setEstudio(e.target.value)}
                  placeholder="Ej: Estudio García & Asociados" autoFocus />
              </div>

              <div>
                <label style={lbl}>CUIT del estudio <span style={{ color: C.red }}>*</span></label>
                <input className="inp" value={cuit} onChange={e => setCuit(formatCuit(e.target.value))}
                  placeholder="20-12345678-9" />
              </div>

              {error && <ErrorBox msg={error} />}

              <button type="submit" disabled={loading} style={btnPrimary(loading)}>
                {loading ? 'Creando tu estudio…' : 'Crear mi estudio'}
              </button>

              <button type="button" onClick={() => { setStep(1); setError(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13, textAlign: 'center', padding: 0 }}>
                ← Volver
              </button>
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
function formatCuit(v) { const d = String(v||'').replace(/\D/g,'').slice(0,11); if(d.length<=2)return d; if(d.length<=10)return`${d.slice(0,2)}-${d.slice(2)}`; return`${d.slice(0,2)}-${d.slice(2,10)}-${d.slice(10)}`; }

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
