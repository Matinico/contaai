import Head from 'next/head';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const C = {
  navy:   '#1a3a5c',
  navyLt: '#e8f0f7',
  bg:     '#f0f4f8',
  white:  '#ffffff',
  text:   '#1e293b',
  muted:  '#64748b',
  border: '#e2e8f0',
  red:    '#dc2626',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
};

const MODULES = [
  {
    key: 'iva',
    title: 'Liquidación de IVA',
    desc: 'Registrá comprobantes de compras y ventas, calculá la posición IVA y exportá el Libro.',
    href: '/iva',
    active: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="3" width="15" height="19" rx="2" stroke="#1a3a5c" strokeWidth="1.6"/>
        <path d="M8 9h7M8 13h5M8 17h6" stroke="#1a3a5c" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="21" cy="21" r="6" fill="#e8f0f7" stroke="#1a3a5c" strokeWidth="1.4"/>
        <path d="M19 21l1.5 1.5L23 19" stroke="#1a3a5c" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: 'sueldos',
    title: 'Liquidación de sueldos',
    desc: 'Liquidá haberes, cargas sociales y generá recibos del personal.',
    href: null,
    active: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="10" r="4" stroke="#cbd5e1" strokeWidth="1.6"/>
        <path d="M6 24c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'iibb',
    title: 'Ingresos brutos',
    desc: 'Declaraciones mensuales de IIBB por jurisdicción.',
    href: null,
    active: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="16" width="4" height="8" rx="1" stroke="#cbd5e1" strokeWidth="1.6"/>
        <rect x="12" y="10" width="4" height="14" rx="1" stroke="#cbd5e1" strokeWidth="1.6"/>
        <rect x="20" y="4" width="4" height="20" rx="1" stroke="#cbd5e1" strokeWidth="1.6"/>
      </svg>
    ),
  },
];

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(()=>{ if(status==='unauthenticated') router.replace('/login'); },[status,router]);

  useEffect(()=>{
    const h = e => { if(menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  },[]);

  const name = session?.user?.name || session?.user?.email?.split('@')[0] || 'usuario';

  if(status==='loading'||status==='unauthenticated'){
    return <div style={{background:C.bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:C.font,color:C.muted}}>Cargando…</div>;
  }

  return (
    <>
      <Head><title>CIA — Dashboard</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};color:${C.text};font-family:${C.font};min-height:100vh;}
        input,select,button{font-family:${C.font};}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── HEADER ── */}
      <header style={{background:C.navy,height:56,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,background:'rgba(255,255,255,0.15)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="2" width="11" height="14" rx="1.5" stroke="white" strokeWidth="1.5"/>
              <path d="M6 7h5M6 10h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="15" cy="14" r="4" fill={C.navy} stroke="white" strokeWidth="1.5"/>
              <path d="M13 14l1.5 1.5L17 12.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{color:'white',fontWeight:700,fontSize:17,letterSpacing:'0.02em'}}>CIA</span>
        </div>

        {/* User menu */}
        <div ref={menuRef} style={{position:'relative'}}>
          <button onClick={()=>setMenu(v=>!v)}
            style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:7,padding:'6px 12px',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>
              {(session?.user?.email||'U')[0].toUpperCase()}
            </div>
            <span style={{maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12}}>
              {session?.user?.name||session?.user?.email}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>

          {menu && (
            <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',background:C.white,border:`1px solid ${C.border}`,borderRadius:10,width:210,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',overflow:'hidden',animation:'fadeIn 0.15s ease',zIndex:100}}>
              <div style={{padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                <Link href="/clientes" onClick={()=>setMenu(false)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',fontSize:13,color:C.text,textDecoration:'none'}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke={C.muted} strokeWidth="1.3"/><path d="M2.5 12c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round"/></svg>
                  Clientes / Proveedores
                </Link>
              </div>
              <div style={{padding:'8px 0'}}>
                <button onClick={()=>signOut({callbackUrl:'/login'})} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 14px',background:'none',border:'none',cursor:'pointer',fontSize:13,color:C.red,fontWeight:600,textAlign:'left'}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 10l3-3-3-3M12 7H5M5 2H2v10h3" stroke={C.red} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{maxWidth:860,margin:'0 auto',padding:'56px 24px'}}>
        <div style={{marginBottom:44}}>
          <div style={{fontSize:13,color:C.muted,marginBottom:6}}>
            {new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </div>
          <h1 style={{fontSize:30,fontWeight:700,color:C.text}}>
            Bienvenido, {name.charAt(0).toUpperCase()+name.slice(1)} 👋
          </h1>
        </div>

        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>
          Módulos disponibles
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
          {MODULES.map(m => {
            const inner = (
              <div style={{
                background: C.white,
                border: `1px solid ${m.active ? C.navy : C.border}`,
                borderTop: `3px solid ${m.active ? C.navy : C.border}`,
                borderRadius: 10,
                padding: '22px 20px',
                cursor: m.active ? 'pointer' : 'default',
                opacity: m.active ? 1 : 0.55,
                boxShadow: m.active ? '0 2px 8px rgba(26,58,92,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.15s, transform 0.15s',
                display: 'block',
                textDecoration: 'none',
                color: C.text,
              }}
              onMouseEnter={e=>{ if(m.active){ e.currentTarget.style.boxShadow='0 6px 20px rgba(26,58,92,0.15)'; e.currentTarget.style.transform='translateY(-2px)'; }}}
              onMouseLeave={e=>{ e.currentTarget.style.boxShadow=m.active?'0 2px 8px rgba(26,58,92,0.1)':'0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform='none'; }}
              >
                <div style={{marginBottom:14}}>{m.icon}</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:6,color:m.active?C.navy:C.muted}}>{m.title}</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.5,marginBottom:14}}>{m.desc}</div>
                {m.active
                  ? <span style={{fontSize:12,fontWeight:700,color:C.navy,background:C.navyLt,padding:'4px 10px',borderRadius:5}}>Acceder →</span>
                  : <span style={{fontSize:11,color:'#94a3b8',background:'#f1f5f9',padding:'3px 8px',borderRadius:4,fontWeight:600}}>Próximamente</span>
                }
              </div>
            );
            return m.active
              ? <Link key={m.key} href={m.href} style={{display:'block',textDecoration:'none'}}>{inner}</Link>
              : <div key={m.key}>{inner}</div>;
          })}
        </div>
      </div>
    </>
  );
}
