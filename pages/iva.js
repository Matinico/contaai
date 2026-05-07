import Head from 'next/head';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const C = {
  navy:    '#1a3a5c',
  navyDk:  '#122840',
  navyLt:  '#e8f0f7',
  bg:      '#f0f4f8',
  white:   '#ffffff',
  text:    '#1e293b',
  muted:   '#64748b',
  border:  '#e2e8f0',
  green:   '#16a34a',
  red:     '#dc2626',
  yellow:  '#d97706',
  font:    "system-ui,-apple-system,'Segoe UI',sans-serif",
  mono:    "'Courier New',Courier,monospace",
};

const CATEGORIES = {
  servicios:    { label:'Servicios',       alicuota:21   },
  honorarios:   { label:'Honorarios',      alicuota:21   },
  alquileres:   { label:'Alquileres',      alicuota:21   },
  insumos:      { label:'Insumos',         alicuota:10.5 },
  servicios_pub:{ label:'Serv. Públicos',  alicuota:27   },
  transporte:   { label:'Transporte',      alicuota:21   },
  repuestos:    { label:'Repuestos',       alicuota:21   },
  otros:        { label:'Otros',           alicuota:21   },
};

function fmt(n) {
  return (n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function fileToBase64(file) {
  return new Promise((res,rej)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = ()=>{
      const MAX=1200; let w=img.width,h=img.height;
      if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      res(canvas.toDataURL('image/jpeg',0.85).split(',')[1]);
      URL.revokeObjectURL(url);
    };
    img.onerror=rej; img.src=url;
  });
}

function xc(v,t='String'){const s=String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');return`<Cell><Data ss:Type="${t}">${s}</Data></Cell>`;}
function xh(v){return`<Cell ss:StyleID="H"><Data ss:Type="String">${String(v??'').replace(/&/g,'&amp;')}</Data></Cell>`;}
function xr(...c){return`<Row>${c.join('')}</Row>`;}

function exportXLS(compras,ventas,period){
  if(!compras.length&&!ventas.length)return;
  const cHdr=xr(...['#','Fecha','Tipo','Comprobante','Proveedor','CUIT Prov.','CUIT Rec.','Concepto','Categoría','Alíc.%','Neto','IVA CF','Total','CAE'].map(xh));
  const cRows=compras.map((e,i)=>xr(xc(i+1,'Number'),xc(e.fecha),xc(e.tipo),xc(`Fac.${e.tipo} ${e.nro}`),xc(e.proveedor),xc(e.cuit||''),xc(e.cuit_rec||''),xc(e.concepto),xc(CATEGORIES[e.categoria]?.label||e.categoria),xc(e.alicuota,'Number'),xc(e.neto,'Number'),xc(e.iva,'Number'),xc(e.total,'Number'),xc(e.cae||''))).join('');
  const cTot=xr(xh(''),xh(''),xh(''),xh(''),xh(''),xh(''),xh(''),xh(''),xh(''),xh('TOTAL'),xc(compras.reduce((s,e)=>s+e.neto,0),'Number'),xc(compras.reduce((s,e)=>s+e.iva,0),'Number'),xc(compras.reduce((s,e)=>s+e.total,0),'Number'),xh(''));
  const vHdr=xr(...['#','Fecha','Tipo','Comprobante','Cliente','CUIT Cliente','Concepto','Categoría','Alíc.%','Neto','IVA DF','Total','CAE'].map(xh));
  const vRows=ventas.map((e,i)=>xr(xc(i+1,'Number'),xc(e.fecha),xc(e.tipo),xc(`Fac.${e.tipo} ${e.nro}`),xc(e.cliente),xc(e.cuit_cli||''),xc(e.concepto),xc(CATEGORIES[e.categoria]?.label||e.categoria),xc(e.alicuota,'Number'),xc(e.neto,'Number'),xc(e.iva,'Number'),xc(e.total,'Number'),xc(e.cae||''))).join('');
  const vTot=xr(xh(''),xh(''),xh(''),xh(''),xh(''),xh(''),xh(''),xh('TOTAL'),xc(ventas.reduce((s,e)=>s+e.neto,0),'Number'),xc(ventas.reduce((s,e)=>s+e.iva,0),'Number'),xc(ventas.reduce((s,e)=>s+e.total,0),'Number'),xh(''));
  const df=ventas.reduce((s,e)=>s+e.iva,0),cf=compras.reduce((s,e)=>s+e.iva,0),saldo=df-cf;
  const posRows=[xr(xh('Concepto'),xh('Importe ARS')),xr(xc('Débito Fiscal (IVA Ventas)'),xc(df,'Number')),xr(xc('Crédito Fiscal (IVA Compras)'),xc(cf,'Number')),xr(xc(''),xc('')),xr(xh(saldo>=0?'SALDO A PAGAR':'SALDO A FAVOR'),xc(Math.abs(saldo),'Number'))].join('');
  const xml=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="H"><Font ss:Bold="1"/></Style></Styles><Worksheet ss:Name="IVA Compras"><Table>${cHdr}${cRows}${cTot}</Table></Worksheet><Worksheet ss:Name="IVA Ventas"><Table>${vHdr}${vRows}${vTot}</Table></Worksheet><Worksheet ss:Name="Posición IVA"><Table>${posRows}</Table></Worksheet></Workbook>`;
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([xml],{type:'application/vnd.ms-excel'}));
  a.download=`ContaAI_LibroIVA_${period.replace('/','_')}.xls`;a.click();
}

function entryToDb(entry,libro,periodo){
  return{libro,periodo,fecha:entry.fecha,tipo:entry.tipo,nro:entry.nro,
    proveedor:libro==='ventas'?(entry.cliente??''):(entry.proveedor??''),
    cuit:libro==='ventas'?(entry.cuit_cli??''):(entry.cuit??''),
    concepto:entry.concepto,categoria:entry.categoria,alicuota:entry.alicuota,
    neto:entry.neto,iva:entry.iva,total:entry.total};
}
function dbToEntry(row){
  const base={id:row.id,fecha:row.fecha??'',tipo:row.tipo??'B',nro:row.nro??'',
    concepto:row.concepto??'',categoria:row.categoria??'otros',alicuota:Number(row.alicuota??21),
    neto:Number(row.neto??0),iva:Number(row.iva??0),total:Number(row.total??0),cae:''};
  return row.libro==='ventas'
    ?{...base,cliente:row.proveedor??'',cuit_cli:row.cuit??''}
    :{...base,proveedor:row.proveedor??'',cuit:row.cuit??'',cuit_rec:''};
}

// ── Shared UI primitives ───────────────────────────────────────────────────
const inp = {width:'100%',background:C.white,border:`1px solid ${C.border}`,borderRadius:6,padding:'8px 10px',color:C.text,fontFamily:C.mono,fontSize:13,outline:'none',boxSizing:'border-box'};
const lbl = {display:'block',fontSize:11,fontWeight:600,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'};
const card = {background:C.white,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'};

export default function IvaPage() {
  const { data:session, status } = useSession();
  const router = useRouter();

  useEffect(()=>{ if(status==='unauthenticated') router.replace('/login'); },[status,router]);

  const [activeTab,      setActiveTab]      = useState('compras');
  const [comprasEntries, setComprasEntries] = useState([]);
  const [comprasQueue,   setComprasQueue]   = useState([]);
  const [comprasProc,    setComprasProc]    = useState(false);
  const [comprasFilter,  setComprasFilter]  = useState('all');
  const [comprasSearch,  setComprasSearch]  = useState('');
  const [ventasEntries,  setVentasEntries]  = useState([]);
  const [ventasQueue,    setVentasQueue]    = useState([]);
  const [ventasProc,     setVentasProc]     = useState(false);
  const [ventasFilter,   setVentasFilter]   = useState('all');
  const [ventasSearch,   setVentasSearch]   = useState('');
  const [modal,          setModal]          = useState(null);
  const [form,           setForm]           = useState({});
  const [toast,          setToast]          = useState(null);
  const [period,         setPeriod]         = useState('05/2026');
  const [dbLoading,      setDbLoading]      = useState(false);
  const [entityModal,    setEntityModal]    = useState(null);
  const [entityForm,     setEntityForm]     = useState({nombre:''});
  const [userMenu,       setUserMenu]       = useState(false);

  const fileRef          = useRef();
  const resolveRef       = useRef(null);
  const entityResolveRef = useRef(null);
  const menuRef          = useRef(null);

  // Close user menu on outside click
  useEffect(()=>{
    const h=(e)=>{ if(menuRef.current&&!menuRef.current.contains(e.target)) setUserMenu(false); };
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);

  useEffect(()=>{
    if(status!=='authenticated')return;
    setDbLoading(true);
    Promise.all([
      fetch(`/api/facturas?periodo=${encodeURIComponent(period)}&libro=compras`).then(r=>r.json()),
      fetch(`/api/facturas?periodo=${encodeURIComponent(period)}&libro=ventas`).then(r=>r.json()),
    ]).then(([c,v])=>{
      setComprasEntries((c.data??[]).map(dbToEntry));
      setVentasEntries((v.data??[]).map(dbToEntry));
    }).catch(console.error).finally(()=>setDbLoading(false));
  },[status,period]);

  const isCompras  = activeTab==='compras';
  const entries    = isCompras?comprasEntries:ventasEntries;
  const queue      = isCompras?comprasQueue:ventasQueue;
  const processing = isCompras?comprasProc:ventasProc;
  const filter     = isCompras?comprasFilter:ventasFilter;
  const setFilter  = isCompras?setComprasFilter:setVentasFilter;
  const search     = isCompras?comprasSearch:ventasSearch;
  const setSearch  = isCompras?setComprasSearch:setVentasSearch;
  const setEntries = isCompras?setComprasEntries:setVentasEntries;

  const filtered = entries.filter(e=>{
    const name = isCompras?e.proveedor:e.cliente;
    return(!search||name?.toLowerCase().includes(search.toLowerCase()))
        &&(filter==='all'||String(e.alicuota)===filter);
  });

  const totalNeto  = entries.reduce((s,e)=>s+e.neto,0);
  const totalIva   = entries.reduce((s,e)=>s+e.iva,0);
  const totalTotal = entries.reduce((s,e)=>s+e.total,0);
  const debitoFiscal  = ventasEntries.reduce((s,e)=>s+e.iva,0);
  const creditoFiscal = comprasEntries.reduce((s,e)=>s+e.iva,0);
  const posicionIVA   = debitoFiscal-creditoFiscal;

  const showToast=(icon,msg,isErr=false)=>{setToast({icon,msg,isErr});setTimeout(()=>setToast(null),3500);};

  const handleFiles=useCallback((files,mode)=>{
    const arr=Array.from(files);
    const setter=mode==='ventas'?setVentasQueue:setComprasQueue;
    setter(q=>[...q,...arr.map(f=>({file:f,status:'pending'}))]);
  },[]);

  const buildComprasForm=(d)=>{
    if(!d)return{fecha:'',tipo:'B',nro:'',proveedor:'',cuit:'',cuit_rec:'',concepto:'',categoria:'otros',alicuota:21,total:0,neto:0,iva:0,cae:'',confianza:0};
    const catKey=d.categoria||'otros',alicuota=d.alicuota??CATEGORIES[catKey]?.alicuota??21,total=d.total||0;
    let neto=d.neto||0,iva=d.iva||0;
    if(d.tipo_comprobante==='C'){neto=total;iva=0;}
    else if(!d.iva_discriminado&&iva&&total){neto=total-iva;}
    else if(!d.iva_discriminado&&alicuota>0&&total){neto=total/(1+alicuota/100);iva=total-neto;}
    return{fecha:d.fecha||'',tipo:d.tipo_comprobante||'B',nro:d.nro_comprobante||'',proveedor:d.proveedor||'',cuit:d.cuit_proveedor||'',cuit_rec:d.cuit_receptor||'',concepto:d.concepto||'',categoria:catKey,alicuota,total,neto,iva,cae:d.cae||'',confianza:d.confianza||0};
  };

  const buildVentasForm=(d)=>{
    if(!d)return{fecha:'',tipo:'B',nro:'',cliente:'',cuit_cli:'',concepto:'',categoria:'otros',alicuota:21,total:0,neto:0,iva:0,cae:'',confianza:0};
    const catKey=d.categoria||'otros',alicuota=d.alicuota??CATEGORIES[catKey]?.alicuota??21,total=d.total||0;
    let neto=d.neto||0,iva=d.iva||0;
    if(d.tipo_comprobante==='C'){neto=total;iva=0;}
    else if(!d.iva_discriminado&&iva&&total){neto=total-iva;}
    else if(!d.iva_discriminado&&alicuota>0&&total){neto=total/(1+alicuota/100);iva=total-neto;}
    return{fecha:d.fecha||'',tipo:d.tipo_comprobante||'B',nro:d.nro_comprobante||'',cliente:d.cliente||'',cuit_cli:d.cuit_cliente||'',concepto:d.concepto||'',categoria:catKey,alicuota,total,neto,iva,cae:d.cae||'',confianza:d.confianza||0};
  };

  const processQueue=async(mode)=>{
    const isC=mode==='compras';
    const q=isC?comprasQueue:ventasQueue,setQ=isC?setComprasQueue:setVentasQueue;
    const setProc=isC?setComprasProc:setVentasProc;
    const endpoint=isC?'/api/procesar-factura':'/api/procesar-venta';
    const buildForm=isC?buildComprasForm:buildVentasForm;
    const setE=isC?setComprasEntries:setVentasEntries;
    setProc(true);
    for(const item of q.filter(x=>x.status==='pending')){
      setQ(q=>q.map(x=>x.file===item.file?{...x,status:'processing'}:x));
      try{
        const base64=await fileToBase64(item.file);
        const rawType=item.file.type||'';
        const mediaType=['image/jpeg','image/png','image/gif','image/webp'].includes(rawType)?rawType:'image/jpeg';
        const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:base64,mediaType})});
        const json=await res.json();
        const aiData=res.ok?json.data:null;
        if(!res.ok)showToast('⚠️',json.error||'Error de API',true);
        const entry=await new Promise(resolve=>{resolveRef.current=resolve;setModal({file:item.file,data:aiData,mode});setForm(buildForm(aiData));});
        if(entry){
          const cuit=mode==='ventas'?entry.cuit_cli:entry.cuit;
          let cuit_entidad=cuit||null;
          if(cuit){
            try{
              const chk=await fetch(`/api/entidades?cuit=${encodeURIComponent(cuit)}`);
              const chkJ=await chk.json();
              if(!chkJ.data){
                const nombre=mode==='ventas'?entry.cliente:entry.proveedor;
                const tipo=mode==='ventas'?'cliente':'proveedor';
                const confirmed=await new Promise(resolve=>{entityResolveRef.current=resolve;setEntityModal({nombre,cuit,tipo});setEntityForm({nombre:nombre||''});});
                if(confirmed)await fetch('/api/entidades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cuit,nombre:confirmed.nombre,tipo})});
              }
            }catch(e){console.error('Error verificando entidad:',e);}
          }
          try{
            const saveRes=await fetch('/api/facturas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...entryToDb(entry,mode,period),cuit_entidad})});
            const saveJson=await saveRes.json();
            if(!saveRes.ok)throw new Error(saveJson.error);
            setE(e=>[...e,dbToEntry(saveJson.data)]);
          }catch(err){showToast('⚠️','Error al guardar: '+err.message,true);}
        }
        setQ(q=>q.map(x=>x.file===item.file?{...x,status:'done'}:x));
      }catch(err){console.error(err);showToast('⚠️','Error procesando archivo',true);setQ(q=>q.map(x=>x.file===item.file?{...x,status:'error'}:x));}
    }
    setProc(false);showToast('✅','Procesamiento completado');
  };

  const updateForm=(key,val)=>{
    setForm(f=>{
      const u={...f,[key]:val};
      if(key==='categoria'){u.alicuota=CATEGORIES[val]?.alicuota??21;if(u.total>0){u.neto=u.total/(1+u.alicuota/100);u.iva=u.total-u.neto;}}
      if(key==='alicuota'||key==='total'){const a=parseFloat(key==='alicuota'?val:u.alicuota)||0,t=parseFloat(key==='total'?val:u.total)||0;if(u.tipo==='C'||a===0){u.neto=t;u.iva=0;}else{u.neto=t/(1+a/100);u.iva=t-u.neto;}}
      if(key==='neto'){const n=parseFloat(val)||0,a=parseFloat(u.alicuota)||0;u.iva=n*a/100;u.total=n+u.iva;}
      if(key==='tipo'&&val==='C'){u.alicuota=0;u.iva=0;u.neto=u.total;}
      return u;
    });
  };

  const confirmEntry=()=>{
    const isV=modal?.mode==='ventas';
    const entry=isV?{id:Date.now(),fecha:form.fecha,tipo:form.tipo,nro:form.nro,cliente:form.cliente,cuit_cli:form.cuit_cli,concepto:form.concepto,categoria:form.categoria,alicuota:parseFloat(form.alicuota),neto:parseFloat(form.neto)||0,iva:parseFloat(form.iva)||0,total:parseFloat(form.total)||0,cae:form.cae}:{id:Date.now(),fecha:form.fecha,tipo:form.tipo,nro:form.nro,proveedor:form.proveedor,cuit:form.cuit,cuit_rec:form.cuit_rec,concepto:form.concepto,categoria:form.categoria,alicuota:parseFloat(form.alicuota),neto:parseFloat(form.neto)||0,iva:parseFloat(form.iva)||0,total:parseFloat(form.total)||0,cae:form.cae};
    setModal(null);
    if(resolveRef.current){resolveRef.current(entry);resolveRef.current=null;}
    showToast('✓',(isV?entry.cliente:entry.proveedor)||'Comprobante guardado');
  };
  const cancelModal=()=>{setModal(null);if(resolveRef.current){resolveRef.current(null);resolveRef.current=null;}};
  const confirmEntity=()=>{setEntityModal(null);if(entityResolveRef.current){entityResolveRef.current({nombre:entityForm.nombre});entityResolveRef.current=null;}};
  const skipEntity=()=>{setEntityModal(null);if(entityResolveRef.current){entityResolveRef.current(null);entityResolveRef.current=null;}};
  const handleDelete=async(id,libro)=>{
    const res=await fetch(`/api/facturas/${id}`,{method:'DELETE'});
    if(!res.ok){showToast('⚠️','Error al eliminar',true);return;}
    if(libro==='compras')setComprasEntries(x=>x.filter(r=>r.id!==id));
    else setVentasEntries(x=>x.filter(r=>r.id!==id));
  };

  const isVentasModal=modal?.mode==='ventas';
  const previewUrl=modal?.file?.type?.startsWith('image/')?URL.createObjectURL(modal.file):null;

  const PERIODS=['05/2026','04/2026','03/2026','02/2026','01/2026','12/2025','11/2025','10/2025'];

  if(status==='loading'||status==='unauthenticated'){
    return <div style={{background:C.bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:C.font,color:C.muted}}>Cargando…</div>;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>CIA — Liquidación de IVA</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};color:${C.text};font-family:${C.font};min-height:100vh;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
        input,select,button{font-family:${C.font};}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        .tr-hover:hover td{background:#f8fafc;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── TOPBAR ── */}
      <header style={{background:C.navy,height:56,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',position:'sticky',top:0,zIndex:50,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,background:'rgba(255,255,255,0.15)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="2" width="11" height="14" rx="1.5" stroke="white" strokeWidth="1.5"/>
              <path d="M6 7h5M6 10h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="15" cy="14" r="4" fill={C.navy} stroke="white" strokeWidth="1.5"/>
              <path d="M13 14l1.5 1.5L17 12.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <Link href="/" style={{color:'white',fontWeight:700,fontSize:17,letterSpacing:'0.02em',textDecoration:'none'}}>CIA</Link>
          {/* Tabs */}
          <div style={{display:'flex',marginLeft:16,gap:2}}>
            {[{key:'compras',label:'Compras'},{key:'ventas',label:'Ventas'}].map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                style={{padding:'6px 16px',borderRadius:6,border:'none',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                  background:activeTab===t.key?'rgba(255,255,255,0.2)':'transparent',
                  color:activeTab===t.key?'white':'rgba(255,255,255,0.6)'}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period selector */}
        <select value={period} onChange={e=>setPeriod(e.target.value)}
          style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:7,padding:'6px 12px',color:'white',fontSize:13,fontWeight:600,outline:'none',cursor:'pointer'}}>
          {PERIODS.map(p=><option key={p} value={p} style={{background:C.navy}}>{p}</option>)}
        </select>

        {/* User menu */}
        <div ref={menuRef} style={{position:'relative'}}>
          <button onClick={()=>setUserMenu(v=>!v)}
            style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:7,padding:'6px 12px',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>
              {(session?.user?.email||'U')[0].toUpperCase()}
            </div>
            <span style={{maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12}}>
              {session?.user?.name||session?.user?.email}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>

          {userMenu && (
            <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',background:C.white,border:`1px solid ${C.border}`,borderRadius:10,width:220,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',overflow:'hidden',animation:'fadeIn 0.15s ease',zIndex:100}}>
              <div style={{padding:'8px 0'}}>
                <div style={{padding:'4px 14px 8px',fontSize:11,color:C.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>Módulos</div>
                <button style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 14px',background:'none',border:'none',cursor:'pointer',fontSize:13,color:C.navy,fontWeight:600,textAlign:'left'}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:C.navy,display:'inline-block'}}/>
                  Liquidación de IVA
                  <span style={{marginLeft:'auto',fontSize:10,background:C.navyLt,color:C.navy,padding:'2px 6px',borderRadius:4,fontWeight:700}}>activo</span>
                </button>
                {['Liquidación de sueldos','Ingresos brutos'].map(m=>(
                  <button key={m} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 14px',background:'none',border:'none',cursor:'not-allowed',fontSize:13,color:'#94a3b8',textAlign:'left'}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'#e2e8f0',display:'inline-block'}}/>
                    {m}
                    <span style={{marginLeft:'auto',fontSize:10,color:'#94a3b8'}}>pronto</span>
                  </button>
                ))}
              </div>
              <div style={{borderTop:`1px solid ${C.border}`,padding:'8px 0'}}>
                <Link href="/clientes" style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',fontSize:13,color:C.text,textDecoration:'none'}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke={C.muted} strokeWidth="1.3"/><path d="M2.5 12c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round"/></svg>
                  Clientes / Proveedores
                </Link>
                <button onClick={()=>exportXLS(comprasEntries,ventasEntries,period)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 14px',background:'none',border:'none',cursor:'pointer',fontSize:13,color:C.text,textAlign:'left'}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v7M4 6l3 3 3-3M2 10v2h10v-2" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Exportar Excel
                </button>
              </div>
              <div style={{borderTop:`1px solid ${C.border}`,padding:'8px 0'}}>
                <button onClick={()=>signOut({callbackUrl:'/login'})} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 14px',background:'none',border:'none',cursor:'pointer',fontSize:13,color:C.red,textAlign:'left',fontWeight:600}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 10l3-3-3-3M12 7H5M5 2H2v10h3" stroke={C.red} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div style={{maxWidth:1280,margin:'0 auto',padding:'24px 24px'}}>

        {/* ── STAT CARDS ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
          {(isCompras?[
            {label:'Comprobantes',      val:comprasEntries.length,     unit:'',   accent:C.navy},
            {label:'Neto Gravado',      val:'$ '+fmt(totalNeto),  unit:'',   accent:'#0369a1'},
            {label:'IVA Crédito Fiscal',val:'$ '+fmt(totalIva),   unit:'',   accent:'#047857'},
            {label:'Total Compras',     val:'$ '+fmt(totalTotal), unit:'',   accent:'#b45309'},
          ]:[
            {label:'Comprobantes',      val:ventasEntries.length,      unit:'',   accent:C.navy},
            {label:'Neto Gravado',      val:'$ '+fmt(totalNeto),  unit:'',   accent:'#0369a1'},
            {label:'IVA Débito Fiscal', val:'$ '+fmt(totalIva),   unit:'',   accent:'#9333ea'},
            {label:'Total Ventas',      val:'$ '+fmt(totalTotal), unit:'',   accent:'#b45309'},
          ]).map(s=>(
            <div key={s.label} style={{...card,borderTop:`3px solid ${s.accent}`,padding:'16px 18px'}}>
              <div style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>{s.label}</div>
              <div style={{fontSize:22,fontWeight:700,color:s.accent,fontVariantNumeric:'tabular-nums'}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:20,alignItems:'start'}}>

          {/* LEFT — Upload panel */}
          <div style={{...card,padding:20,position:'sticky',top:72}}>
            <div style={{fontSize:12,fontWeight:700,color:C.navy,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:14}}>
              {isCompras?'Facturas de compra':'Facturas de venta'}
            </div>

            {/* Drop zone */}
            <div
              onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files,activeTab);}}
              onDragOver={e=>e.preventDefault()}
              onClick={()=>fileRef.current?.click()}
              style={{border:`2px dashed ${C.border}`,borderRadius:8,padding:'24px 16px',textAlign:'center',cursor:'pointer',background:'#fafbfc',transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.navy;e.currentTarget.style.background=C.navyLt;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background='#fafbfc'}}
            >
              <input ref={fileRef} type="file" accept="image/*,.pdf" multiple style={{display:'none'}} onChange={e=>handleFiles(e.target.files,activeTab)}/>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{margin:'0 auto 10px'}}><rect x="6" y="4" width="18" height="22" rx="2" stroke={C.muted} strokeWidth="1.5"/><path d="M10 10h10M10 14h7M10 18h5" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"/><circle cx="26" cy="26" r="8" fill={C.navy}/><path d="M23 26l2.5 2.5L29 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>{isCompras?'Arrastrá las facturas recibidas':'Arrastrá las facturas emitidas'}</div>
              <div style={{fontSize:12,color:C.muted}}>Imágenes, fotos o PDFs</div>
            </div>

            {/* Queue */}
            {queue.length>0&&(
              <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:6,maxHeight:220,overflowY:'auto'}}>
                {queue.map((item,i)=>{
                  const sc={pending:C.muted,processing:C.yellow,done:C.green,error:C.red}[item.status];
                  return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'#fafbfc',border:`1px solid ${C.border}`,borderRadius:7,fontSize:12}}>
                      <div style={{width:30,height:30,borderRadius:5,background:C.border,flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
                        {item.file.type?.startsWith('image/')?<img src={URL.createObjectURL(item.file)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'📄'}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:C.text}}>{item.file.name}</div>
                        <div style={{fontSize:11,color:sc,marginTop:2,display:'flex',alignItems:'center',gap:4}}>
                          <span style={{width:5,height:5,borderRadius:'50%',background:sc,display:'inline-block'}}/>
                          {item.status==='pending'?'Pendiente':item.status==='processing'?'Procesando…':item.status==='done'?'Listo':'Error'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={()=>processQueue(activeTab)}
              disabled={processing||!queue.some(q=>q.status==='pending')}
              style={{width:'100%',marginTop:14,padding:'11px',background:C.navy,color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer',opacity:(processing||!queue.some(q=>q.status==='pending'))?0.45:1,transition:'opacity 0.15s'}}>
              {processing?'Procesando…':'Procesar con IA'}
            </button>

            {/* Alícuotas ref */}
            <div style={{marginTop:16,padding:'12px 14px',background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Alícuotas IVA</div>
              {[['Servicios públicos','27%'],['Servicios / Honorarios','21%'],['Insumos básicos','10,5%'],['Exento / Monotributo','0%']].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                  <span style={{color:C.muted}}>{l}</span>
                  <span style={{fontWeight:700,color:C.navy,fontFamily:C.mono}}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Table */}
          <div style={{...card,overflow:'hidden'}}>
            {/* Table toolbar */}
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'6px 10px'}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke={C.muted} strokeWidth="1.3"/><path d="M9.5 9.5l2 2" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round"/></svg>
                  <input placeholder={isCompras?'Buscar proveedor…':'Buscar cliente…'} value={search} onChange={e=>setSearch(e.target.value)}
                    style={{background:'none',border:'none',outline:'none',color:C.text,fontSize:13,width:150}}/>
                </div>
                {['all','21','10.5','27'].map(f=>(
                  <button key={f} onClick={()=>setFilter(f)}
                    style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:`1px solid ${filter===f?C.navy:C.border}`,background:filter===f?C.navy:'transparent',color:filter===f?'white':C.muted,transition:'all 0.15s'}}>
                    {f==='all'?'Todos':f+'%'}
                  </button>
                ))}
              </div>
              <span style={{fontSize:12,color:C.muted}}>{filtered.length} comprobante{filtered.length!==1?'s':''}</span>
            </div>

            {/* Table */}
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#f8fafc',borderBottom:`1px solid ${C.border}`}}>
                    {(isCompras
                      ?['#','Fecha','Comprobante','Proveedor','CUIT','Concepto','Cat.','Alíc.','Neto','IVA CF','Total','']
                      :['#','Fecha','Comprobante','Cliente','CUIT','Concepto','Cat.','Alíc.','Neto','IVA DF','Total','']
                    ).map(h=>(
                      <th key={h} style={{padding:'9px 12px',textAlign:['Neto','IVA CF','IVA DF','Total'].includes(h)?'right':'left',fontSize:10,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:C.muted,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dbLoading?(
                    <tr><td colSpan={12} style={{padding:'48px',textAlign:'center',color:C.muted,fontSize:13}}>Cargando…</td></tr>
                  ):filtered.length===0?(
                    <tr><td colSpan={12} style={{padding:'48px',textAlign:'center',color:C.muted}}>
                      <div style={{fontSize:32,marginBottom:10}}>📋</div>
                      <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>{entries.length>0?'Sin resultados':'Listo para procesar'}</div>
                      <div style={{fontSize:12}}>{entries.length>0?'Cambiá los filtros':'Cargá facturas y presioná Procesar con IA'}</div>
                    </td></tr>
                  ):filtered.map((e,i)=>(
                    <tr key={e.id} className="tr-hover" style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'10px 12px',color:C.muted,fontFamily:C.mono}}>{i+1}</td>
                      <td style={{padding:'10px 12px',fontFamily:C.mono,color:C.muted,whiteSpace:'nowrap'}}>{e.fecha}</td>
                      <td style={{padding:'10px 12px',fontFamily:C.mono,fontSize:11,whiteSpace:'nowrap'}}>
                        <span style={{background:C.navyLt,color:C.navy,border:`1px solid ${C.border}`,borderRadius:4,padding:'2px 6px',fontWeight:700}}>F{e.tipo}</span>
                        {' '}{e.nro}
                      </td>
                      <td style={{padding:'10px 12px',fontWeight:600,maxWidth:130,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {isCompras?e.proveedor:e.cliente}
                      </td>
                      <td style={{padding:'10px 12px',fontFamily:C.mono,fontSize:11,color:C.muted}}>{isCompras?e.cuit:e.cuit_cli}</td>
                      <td style={{padding:'10px 12px',color:C.muted,maxWidth:110,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={e.concepto}>{e.concepto||'—'}</td>
                      <td style={{padding:'10px 12px',fontSize:11,color:C.muted}}>{CATEGORIES[e.categoria]?.label||e.categoria}</td>
                      <td style={{padding:'10px 12px',textAlign:'center'}}>
                        <span style={{fontFamily:C.mono,fontSize:11,background:C.navyLt,color:C.navy,borderRadius:4,padding:'2px 6px',fontWeight:700}}>{e.alicuota}%</span>
                      </td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:C.mono,fontWeight:500,whiteSpace:'nowrap'}}>$ {fmt(e.neto)}</td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:C.mono,color:isCompras?'#047857':'#9333ea',whiteSpace:'nowrap'}}>$ {fmt(e.iva)}</td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:C.mono,fontWeight:700,whiteSpace:'nowrap'}}>$ {fmt(e.total)}</td>
                      <td style={{padding:'10px 8px'}}>
                        <button onClick={()=>handleDelete(e.id,isCompras?'compras':'ventas')}
                          style={{width:26,height:26,background:'none',border:`1px solid ${C.border}`,borderRadius:5,cursor:'pointer',color:C.muted,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footer — totals by alícuota */}
            {entries.length>0&&(
              <div style={{padding:'12px 16px',borderTop:`1px solid ${C.border}`,background:'#f8fafc',display:'flex',gap:24,flexWrap:'wrap',alignItems:'center',justifyContent:'flex-end'}}>
                {[
                  {l:'Neto 21%',  v:entries.filter(e=>e.alicuota===21).reduce((s,e)=>s+e.neto,0)},
                  {l:'Neto 10,5%',v:entries.filter(e=>e.alicuota===10.5).reduce((s,e)=>s+e.neto,0)},
                  {l:'Neto 27%',  v:entries.filter(e=>e.alicuota===27).reduce((s,e)=>s+e.neto,0)},
                  {l:isCompras?'Total IVA CF':'Total IVA DF',v:totalIva,bold:true},
                ].map(s=>(
                  <div key={s.l} style={{textAlign:'right'}}>
                    <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.l}</div>
                    <div style={{fontFamily:C.mono,fontSize:13,fontWeight:s.bold?700:500,color:s.bold?C.navy:C.text}}>$ {fmt(s.v)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL FACTURA ── */}
      {modal&&(
        <div onClick={cancelModal} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:12,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:C.navy,borderRadius:'12px 12px 0 0'}}>
              <span style={{fontSize:14,fontWeight:700,color:'white'}}>{isVentasModal?'Revisar factura de venta':'Revisar factura de compra'}</span>
              <button onClick={cancelModal} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:6,width:28,height:28,cursor:'pointer',color:'white',fontSize:14}}>✕</button>
            </div>
            <div style={{padding:20}}>
              {previewUrl&&<img src={previewUrl} style={{width:'100%',maxHeight:160,objectFit:'contain',borderRadius:8,border:`1px solid ${C.border}`,marginBottom:14,background:'#f8fafc'}}/>}
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                <span style={{fontSize:11,color:C.muted}}>Confianza IA:</span>
                <div style={{width:70,height:4,background:C.border,borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${(form.confianza||0)*100}%`,background:C.navy,borderRadius:2}}/>
                </div>
                <span style={{fontSize:11,color:C.muted,fontFamily:C.mono}}>{Math.round((form.confianza||0)*100)}%</span>
                {form.tipo==='B'&&<span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,background:'#fef3c7',color:C.yellow,border:'1px solid #fde68a'}}>Factura B — IVA incluido</span>}
                {form.tipo==='C'&&<span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,background:'#f1f5f9',color:C.muted,border:`1px solid ${C.border}`}}>Monotributo</span>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  {label:'Fecha',           key:'fecha',    placeholder:'DD/MM/YYYY', span:1},
                  {label:'Tipo',            key:'tipo',     type:'select',opts:['A','B','C','M'],span:1},
                  {label:'Nro. Comprobante',key:'nro',      placeholder:'0001-00000001',span:2},
                  ...(isVentasModal?[
                    {label:'Cliente',       key:'cliente',  placeholder:'Razón social',span:2},
                    {label:'CUIT Cliente',  key:'cuit_cli', placeholder:'20-12345678-9',span:2},
                  ]:[
                    {label:'Proveedor',     key:'proveedor',placeholder:'Razón social',span:2},
                    {label:'CUIT Proveedor',key:'cuit',     placeholder:'20-12345678-9',span:1},
                    {label:'CUIT Receptor', key:'cuit_rec', placeholder:'20-12345678-9',span:1},
                  ]),
                  {label:'Concepto',        key:'concepto', placeholder:'Descripción',span:2},
                ].map(f=>(
                  <div key={f.key} style={{gridColumn:`span ${f.span}`}}>
                    <label style={lbl}>{f.label}</label>
                    {f.type==='select'
                      ?<select value={form[f.key]||''} onChange={e=>updateForm(f.key,e.target.value)} style={inp}>
                        {f.opts.map(o=><option key={o}>{o}</option>)}
                       </select>
                      :<input value={form[f.key]||''} onChange={e=>updateForm(f.key,e.target.value)} placeholder={f.placeholder} style={inp}/>
                    }
                  </div>
                ))}
                <div style={{gridColumn:'span 2'}}><label style={lbl}>Categoría</label>
                  <select value={form.categoria||'otros'} onChange={e=>updateForm('categoria',e.target.value)} style={inp}>
                    {Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v.label} ({v.alicuota}%)</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Alícuota</label>
                  <select value={form.alicuota??21} onChange={e=>updateForm('alicuota',e.target.value)} style={inp}>
                    {[21,10.5,27,0].map(a=><option key={a} value={a}>{a}%</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Total Factura</label>
                  <input type="number" value={form.total||0} onChange={e=>updateForm('total',e.target.value)} step="0.01" style={inp}/>
                </div>
                <div><label style={lbl}>Neto Gravado</label>
                  <input type="number" value={form.neto||0} onChange={e=>updateForm('neto',e.target.value)} step="0.01" style={{...inp,color:C.green,fontWeight:600}}/>
                </div>
                <div><label style={lbl}>{isVentasModal?'IVA Débito Fiscal':'IVA Crédito Fiscal'}</label>
                  <input type="number" value={form.iva||0} onChange={e=>updateForm('iva',e.target.value)} step="0.01" style={{...inp,color:isVentasModal?'#9333ea':'#0369a1',fontWeight:600}}/>
                </div>
              </div>
            </div>
            <div style={{padding:'12px 20px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={cancelModal} style={{padding:'9px 18px',background:'white',color:C.muted,border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
              <button onClick={confirmEntry} style={{padding:'9px 22px',background:C.navy,color:'white',border:'none',borderRadius:7,fontSize:13,fontWeight:700,cursor:'pointer'}}>Confirmar y guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVA ENTIDAD ── */}
      {entityModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:12,padding:24,width:'100%',maxWidth:400,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
              <div style={{width:38,height:38,borderRadius:9,background:C.navyLt,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 5v5l3 3" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="8" stroke={C.navy} strokeWidth="1.5"/></svg>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:C.text}}>Nuevo {entityModal.tipo} detectado</div>
                <div style={{color:C.muted,fontSize:12,marginTop:2}}>¿Guardarlo en tu listado de entidades?</div>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={lbl}>CUIT</label>
              {entityModal.cuit
                ?<div style={{...inp,background:'#f8fafc',color:C.muted,fontFamily:C.mono}}>{entityModal.cuit}</div>
                :<div style={{padding:'10px 12px',borderRadius:6,background:'#fef2f2',border:'1px solid #fecaca',color:C.red,fontSize:12,fontWeight:600}}>⚠️ No se detectó CUIT — mejorá la foto y volvé a intentar</div>
              }
            </div>
            {entityModal.cuit&&(
              <div style={{marginBottom:20}}>
                <label style={lbl}>Nombre / Razón social</label>
                <input value={entityForm.nombre} onChange={e=>setEntityForm(f=>({...f,nombre:e.target.value}))} style={inp}/>
              </div>
            )}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={skipEntity} style={{padding:'8px 16px',background:'white',color:C.muted,border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer'}}>Omitir</button>
              {entityModal.cuit&&<button onClick={confirmEntity} style={{padding:'8px 18px',background:C.navy,color:'white',border:'none',borderRadius:7,fontSize:13,fontWeight:700,cursor:'pointer'}}>Guardar entidad</button>}
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast&&(
        <div style={{position:'fixed',bottom:24,right:24,background:C.white,border:`1px solid ${toast.isErr?'#fecaca':C.border}`,borderLeft:`4px solid ${toast.isErr?C.red:C.green}`,borderRadius:8,padding:'11px 16px',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8,zIndex:300,boxShadow:'0 4px 16px rgba(0,0,0,0.1)',animation:'slideUp 0.2s ease',color:C.text}}>
          <span>{toast.icon}</span><span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
