import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const INPUT = {
  width: '100%', background: '#0a0a0f', border: '1px solid #2a2a3d',
  borderRadius: 10, padding: '11px 14px', color: '#e8e8f0',
  fontFamily: 'monospace', fontSize: 14, outline: 'none',
};

export default function Login() {
  const { status } = useSession();
  const router = useRouter();

  const [mode,     setMode]     = useState('login'); // 'login' | 'register'
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setLoading(false); return; }
      }

      const result = await signIn('credentials', {
        email, password, redirect: false,
      });

      if (result?.error) {
        setError('Email o contraseña incorrectos');
        setLoading(false);
      } else {
        router.replace('/');
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>ContaAI — {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#0a0a0f;color:#e8e8f0;font-family:'Syne',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;}
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');
      `}</style>

      <div style={{position:'fixed',inset:0,backgroundImage:'linear-gradient(rgba(110,231,183,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(110,231,183,0.03) 1px,transparent 1px)',backgroundSize:'40px 40px',pointerEvents:'none'}}/>
      <div style={{position:'fixed',width:500,height:500,background:'rgba(110,231,183,0.07)',borderRadius:'50%',filter:'blur(120px)',top:-150,right:-100,pointerEvents:'none'}}/>
      <div style={{position:'fixed',width:400,height:400,background:'rgba(129,140,248,0.07)',borderRadius:'50%',filter:'blur(120px)',bottom:-100,left:-100,pointerEvents:'none'}}/>

      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:400,padding:'0 24px'}}>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:48,height:48,background:'linear-gradient(135deg,#6ee7b7,#818cf8)',borderRadius:14,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:24,marginBottom:12}}>⚡</div>
          <div style={{fontFamily:'serif',fontSize:28}}>Conta<span style={{color:'#6ee7b7'}}>AI</span></div>
          <div style={{fontSize:12,color:'#6b6b8a',marginTop:4,fontFamily:'monospace'}}>Libro IVA Compras & Ventas</div>
        </div>

        {/* Card */}
        <div style={{background:'#12121a',border:'1px solid #2a2a3d',borderRadius:20,padding:28}}>

          {/* Tab toggle */}
          <div style={{display:'flex',background:'#0a0a0f',border:'1px solid #2a2a3d',borderRadius:12,padding:4,gap:4,marginBottom:24}}>
            {[{key:'login',label:'Iniciar sesión'},{key:'register',label:'Crear cuenta'}].map(t=>(
              <button key={t.key} onClick={()=>{setMode(t.key);setError('');}}
                style={{flex:1,padding:'8px 0',borderRadius:9,border:'none',fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer',
                  background:mode===t.key?'linear-gradient(135deg,#6ee7b7,#34d399)':'transparent',
                  color:mode===t.key?'#0a0a0f':'#6b6b8a',transition:'all 0.2s'}}>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
            {mode === 'register' && (
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:6}}>Nombre (opcional)</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre" style={INPUT}/>
              </div>
            )}

            <div>
              <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:6}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@empresa.com" required style={INPUT}/>
            </div>

            <div>
              <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:6}}>
                Contraseña {mode === 'register' && <span style={{color:'#6b6b8a',fontWeight:400}}>(mínimo 6 caracteres)</span>}
              </label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={INPUT}/>
            </div>

            {error && (
              <div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#f87171'}}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{marginTop:4,padding:'13px',background:'linear-gradient(135deg,#6ee7b7,#34d399)',color:'#0a0a0f',border:'none',borderRadius:12,
                fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,cursor:'pointer',opacity:loading?0.6:1,transition:'opacity 0.2s'}}>
              {loading ? '⏳ Procesando...' : mode === 'login' ? '→ Entrar' : '✓ Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
