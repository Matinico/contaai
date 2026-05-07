import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const C = {
  navy:   '#1a3a5c',
  navyDk: '#122840',
  navyLt: '#e8f0f7',
  bg:     '#f0f4f8',
  white:  '#ffffff',
  text:   '#1e293b',
  muted:  '#64748b',
  border: '#e2e8f0',
  green:  '#16a34a',
  red:    '#dc2626',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
  mono:   "'Courier New',Courier,monospace",
};

function fmt(n) {
  return (n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

const card = {background:C.white,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'};
const inp  = {width:'100%',background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:'8px 10px',color:C.text,fontFamily:C.font,fontSize:13,outline:'none'};

export default function ClientesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop,  setShowDrop]  = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [facturas,  setFacturas]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [desde,     setDesde]     = useState('');
  const [hasta,     setHasta]     = useState('');

  useEffect(()=>{ if(status==='unauthenticated') router.replace('/login'); },[status,router]);

  // Búsqueda con debounce
  useEffect(()=>{
    if(!query.trim()){ setResults([]); setShowDrop(false); return; }
    const t = setTimeout(async()=>{
      setSearching(true);
      try{
        const r = await fetch(`/api/entidades?q=${encodeURIComponent(query.trim())}`);
        const j = await r.json();
        setResults(j.data??[]);
        setShowDrop(true);
      }catch(e){ console.error(e); }
      finally{ setSearching(false); }
    },300);
    return ()=>clearTimeout(t);
  },[query]);

  // Cargar facturas al seleccionar entidad o cambiar fechas
  useEffect(()=>{
    if(!selected){ setFacturas([]); return; }
    setLoading(true);
    const p = new URLSearchParams({ cuit_entidad: selected.cuit });
    if(desde) p.set('desde',desde);
    if(hasta) p.set('hasta',hasta);
    fetch(`/api/facturas?${p}`)
      .then(r=>r.json())
      .then(j=>setFacturas(j.data??[]))
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[selected,desde,hasta]);

  const selectEntity=(e)=>{ setSelected(e); setQuery(e.nombre); setShowDrop(false); };

  const totalNeto  = facturas.reduce((s,f)=>s+(f.neto||0),0);
  const totalIva   = facturas.reduce((s,f)=>s+(f.iva||0),0);
  const totalTotal = facturas.reduce((s,f)=>s+(f.total||0),0);

  if(status==='loading'||status==='unauthenticated'){
    return <div style={{background:C.bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:C.font,color:C.muted}}>Cargando…</div>;
  }

  return(
    <>
      <Head><title>CIA — Clientes / Proveedores</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};color:${C.text};font-family:${C.font};min-height:100vh;}
        input,select,button{font-family:${C.font};}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
        .tr-hover:hover td{background:#f8fafc;}
        input[type="date"]::-webkit-calendar-picker-indicator{opacity:0.5;cursor:pointer;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── TOPBAR ── */}
      <header style={{background:C.navy,height:56,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:34,height:34,background:'rgba(255,255,255,0.15)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="2" width="11" height="14" rx="1.5" stroke="white" strokeWidth="1.5"/>
              <path d="M6 7h5M6 10h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="15" cy="14" r="4" fill={C.navy} stroke="white" strokeWidth="1.5"/>
              <path d="M13 14l1.5 1.5L17 12.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{color:'white',fontWeight:700,fontSize:17,letterSpacing:'0.02em'}}>CIA</span>
          <span style={{color:'rgba(255,255,255,0.45)',fontSize:14,marginLeft:4}}>/ Clientes y Proveedores</span>
        </div>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:7,padding:'6px 14px',color:'white',fontSize:13,fontWeight:600,textDecoration:'none'}}>
          ← Volver
        </Link>
      </header>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'28px 24px'}}>

        {/* ── BUSCADOR ── */}
        <div style={{marginBottom:24}}>
          <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:4}}>Libro IVA por Entidad</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:16}}>Buscá un proveedor o cliente por nombre o CUIT para ver su historial de comprobantes.</div>

          <div style={{position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,...card,padding:'10px 16px'}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                <circle cx="7" cy="7" r="5" stroke={C.muted} strokeWidth="1.4"/>
                <path d="M11 11l2.5 2.5" stroke={C.muted} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                value={query}
                onChange={e=>{ setQuery(e.target.value); setSelected(null); }}
                onFocus={()=>results.length&&setShowDrop(true)}
                placeholder="Escribí un nombre o CUIT…"
                style={{flex:1,background:'transparent',border:'none',outline:'none',color:C.text,fontSize:15,fontWeight:500}}
              />
              {searching&&<span style={{fontSize:12,color:C.muted}}>buscando…</span>}
              {query&&<button onClick={()=>{setQuery('');setSelected(null);setResults([]);setShowDrop(false);}}
                style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>}
            </div>

            {/* Dropdown */}
            {showDrop&&results.length>0&&(
              <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,...card,zIndex:50,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',animation:'fadeIn 0.15s ease'}}>
                {results.map(e=>(
                  <button key={e.id} onClick={()=>selectEntity(e)}
                    style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',background:'none',border:'none',borderBottom:`1px solid ${C.border}`,cursor:'pointer',textAlign:'left'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:14,color:C.text}}>{e.nombre}</div>
                      <div style={{fontSize:12,color:C.muted,fontFamily:C.mono,marginTop:2}}>{e.cuit}</div>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,background:C.navyLt,color:C.navy,border:`1px solid ${C.border}`,borderRadius:5,padding:'3px 8px',textTransform:'capitalize'}}>
                      {e.tipo||'entidad'}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showDrop&&results.length===0&&!searching&&query.trim()&&(
              <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,...card,padding:'16px',color:C.muted,fontSize:13,zIndex:50}}>
                Sin resultados para "{query}"
              </div>
            )}
          </div>
        </div>

        {/* ── ENTIDAD SELECCIONADA ── */}
        {selected&&(
          <>
            {/* Info + Filtros */}
            <div style={{...card,padding:'16px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap',borderLeft:`4px solid ${C.navy}`}}>
              <div style={{width:44,height:44,borderRadius:10,background:C.navyLt,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="2" width="12" height="15" rx="1.5" stroke={C.navy} strokeWidth="1.5"/><path d="M6 6h6M6 9h4M6 12h5" stroke={C.navy} strokeWidth="1.3" strokeLinecap="round"/><circle cx="17" cy="16" r="4" fill={C.navyLt} stroke={C.navy} strokeWidth="1.3"/><path d="M15.5 16l1 1L18.5 14.5" stroke={C.navy} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{flex:1,minWidth:180}}>
                <div style={{fontWeight:700,fontSize:16,color:C.text}}>{selected.nombre}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2,fontFamily:C.mono}}>
                  CUIT {selected.cuit}
                  {selected.tipo&&<span style={{marginLeft:10,fontFamily:C.font,textTransform:'capitalize',background:C.navyLt,color:C.navy,padding:'1px 8px',borderRadius:4,fontWeight:600,fontSize:11}}>{selected.tipo}</span>}
                </div>
              </div>
              {/* Filtros fecha */}
              <div style={{display:'flex',alignItems:'flex-end',gap:10,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Desde</div>
                  <input type="date" value={desde} onChange={e=>setDesde(e.target.value)}
                    style={{...inp,width:'auto',fontFamily:C.mono,fontSize:12,padding:'6px 10px'}}/>
                </div>
                <div>
                  <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Hasta</div>
                  <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}
                    style={{...inp,width:'auto',fontFamily:C.mono,fontSize:12,padding:'6px 10px'}}/>
                </div>
                {(desde||hasta)&&(
                  <button onClick={()=>{setDesde('');setHasta('');}}
                    style={{padding:'6px 12px',background:'white',border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,fontSize:12,cursor:'pointer'}}>
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Tabla */}
            <div style={{...card,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#f8fafc',borderBottom:`1px solid ${C.border}`}}>
                    {['Fecha','Tipo','Nro. Comprobante','Concepto','Categoría','Alíc.','Libro','Neto','IVA','Total'].map(h=>(
                      <th key={h} style={{padding:'9px 12px',textAlign:['Neto','IVA','Total'].includes(h)?'right':'left',fontSize:10,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:C.muted,whiteSpace:'nowrap'}}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading?(
                    <tr><td colSpan={10} style={{padding:'48px',textAlign:'center',color:C.muted,fontSize:13}}>Cargando…</td></tr>
                  ):facturas.length===0?(
                    <tr><td colSpan={10} style={{padding:'48px',textAlign:'center',color:C.muted}}>
                      <div style={{fontSize:32,marginBottom:10}}>📋</div>
                      <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Sin comprobantes</div>
                      <div style={{fontSize:12}}>No hay facturas registradas para este período</div>
                    </td></tr>
                  ):facturas.map(f=>(
                    <tr key={f.id} className="tr-hover" style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'10px 12px',fontFamily:C.mono,color:C.muted,whiteSpace:'nowrap'}}>{f.fecha||'—'}</td>
                      <td style={{padding:'10px 12px'}}>
                        <span style={{background:C.navyLt,color:C.navy,borderRadius:4,padding:'2px 7px',fontSize:11,fontWeight:700,fontFamily:C.mono}}>F{f.tipo}</span>
                      </td>
                      <td style={{padding:'10px 12px',fontFamily:C.mono,color:C.muted,fontSize:11,whiteSpace:'nowrap'}}>{f.nro||'—'}</td>
                      <td style={{padding:'10px 12px',color:C.text,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={f.concepto}>{f.concepto||'—'}</td>
                      <td style={{padding:'10px 12px',color:C.muted,fontSize:11}}>{f.categoria||'—'}</td>
                      <td style={{padding:'10px 12px',textAlign:'center'}}>
                        <span style={{fontFamily:C.mono,fontSize:11,background:C.navyLt,color:C.navy,borderRadius:4,padding:'2px 6px',fontWeight:700}}>{f.alicuota!=null?`${f.alicuota}%`:'—'}</span>
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <span style={{fontSize:11,fontWeight:600,color:f.libro==='ventas'?'#9333ea':'#047857',textTransform:'capitalize'}}>{f.libro}</span>
                      </td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:C.mono,whiteSpace:'nowrap'}}>$ {fmt(f.neto)}</td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:C.mono,color:C.muted,whiteSpace:'nowrap'}}>$ {fmt(f.iva)}</td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:C.mono,fontWeight:700,color:C.navy,whiteSpace:'nowrap'}}>$ {fmt(f.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Resumen */}
              {!loading&&facturas.length>0&&(
                <div style={{padding:'14px 20px',borderTop:`2px solid ${C.navy}`,background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                  <div style={{fontSize:13,color:C.muted,fontWeight:600}}>
                    {facturas.length} comprobante{facturas.length!==1?'s':''}
                  </div>
                  <div style={{display:'flex',gap:28,flexWrap:'wrap'}}>
                    {[
                      {l:'Neto gravado', v:totalNeto,  color:C.text,   bold:false},
                      {l:'IVA',          v:totalIva,   color:C.muted,  bold:false},
                      {l:'Total',        v:totalTotal, color:C.navy,   bold:true},
                    ].map(s=>(
                      <div key={s.l} style={{textAlign:'right'}}>
                        <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{s.l}</div>
                        <div style={{fontFamily:C.mono,fontWeight:s.bold?700:500,fontSize:s.bold?16:14,color:s.color}}>$ {fmt(s.v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Estado inicial */}
        {!selected&&!query&&(
          <div style={{...card,padding:'60px 40px',textAlign:'center',color:C.muted}}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{margin:'0 auto 16px'}}>
              <circle cx="21" cy="21" r="14" stroke={C.border} strokeWidth="2"/>
              <path d="M30 30l8 8" stroke={C.border} strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 21h10M21 16v10" stroke={C.border} strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:6}}>Buscá una entidad</div>
            <div style={{fontSize:13}}>Ingresá un nombre o CUIT en el buscador para ver su Libro IVA completo</div>
          </div>
        )}

      </div>
    </>
  );
}
