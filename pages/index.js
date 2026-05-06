import Head from 'next/head';
import { useState, useRef, useCallback } from 'react';

const CATEGORIES = {
  servicios:    { label: 'Servicios',        alicuota: 21  },
  honorarios:   { label: 'Honorarios',       alicuota: 21  },
  alquileres:   { label: 'Alquileres',       alicuota: 21  },
  insumos:      { label: 'Insumos',          alicuota: 10.5},
  servicios_pub:{ label: 'Serv. Públicos',   alicuota: 27  },
  transporte:   { label: 'Transporte',       alicuota: 21  },
  repuestos:    { label: 'Repuestos',        alicuota: 21  },
  otros:        { label: 'Otros',            alicuota: 21  },
};

const CAT_COLORS = {
  servicios:'#818cf8', honorarios:'#f472b6', alquileres:'#fbbf24',
  insumos:'#6ee7b7', servicios_pub:'#f472b6', transporte:'#fb923c',
  repuestos:'#6ee7b7', otros:'#6b6b8a',
};

function fmt(n) {
  return (n||0).toLocaleString('es-AR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      URL.revokeObjectURL(url);
      res(base64);
    };
    img.onerror = rej;
    img.src = url;
  });
}

export default function Home() {
  const [entries, setEntries] = useState([]);
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [modal, setModal] = useState(null); // { file, data, resolve }
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('05/2026');
  const fileInputRef = useRef();
  const resolveRef = useRef(null);

  const showToast = (icon, msg, isErr=false) => {
    setToast({ icon, msg, isErr });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFiles = useCallback((files) => {
    const arr = Array.from(files);
    setQueue(q => [...q, ...arr.map(f => ({ file: f, status: 'pending' }))]);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const processAll = async () => {
    setProcessing(true);
    const toProcess = queue.filter(q => q.status === 'pending');

    for (const item of toProcess) {
      setQueue(q => q.map(x => x.file === item.file ? { ...x, status: 'processing' } : x));

      try {
        const base64 = await fileToBase64(item.file);
        const rawType = item.file.type || '';
        const validTypes = ['image/jpeg','image/png','image/gif','image/webp'];
        const mediaType = validTypes.includes(rawType) ? rawType : 'image/jpeg';

        const res = await fetch('/api/procesar-factura', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType })
        });

        const json = await res.json();
        const aiData = res.ok ? json.data : null;
        if (!res.ok) showToast('⚠️', json.error || 'Error de API', true);

        // Show confirmation modal and wait
        const entry = await new Promise(resolve => {
          resolveRef.current = resolve;
          setModal({ file: item.file, data: aiData });
          setForm(buildForm(aiData));
        });

        if (entry) {
          setEntries(e => [...e, entry]);
        }

        setQueue(q => q.map(x => x.file === item.file ? { ...x, status: 'done' } : x));

      } catch (err) {
        console.error(err);
        showToast('⚠️', 'Error procesando archivo', true);
        setQueue(q => q.map(x => x.file === item.file ? { ...x, status: 'error' } : x));
      }
    }

    setProcessing(false);
    showToast('✅', `Procesamiento completado`);
  };

  const buildForm = (d) => {
    if (!d) return { fecha:'', tipo:'B', nro:'', proveedor:'', cuit:'', cuit_rec:'', concepto:'', categoria:'otros', alicuota:21, total:0, neto:0, iva:0, cae:'' };
    const catKey = d.categoria || 'otros';
    const alicuota = d.alicuota ?? CATEGORIES[catKey]?.alicuota ?? 21;
    const total = d.total || 0;
    let neto = d.neto || 0;
    let iva = d.iva || 0;

    if (d.tipo_comprobante === 'C') { neto = total; iva = 0; }
    else if (!d.iva_discriminado && iva && total) { neto = total - iva; }
    else if (!d.iva_discriminado && alicuota > 0 && total) { neto = total / (1 + alicuota/100); iva = total - neto; }

    return {
      fecha: d.fecha || '',
      tipo: d.tipo_comprobante || 'B',
      nro: d.nro_comprobante || '',
      proveedor: d.proveedor || '',
      cuit: d.cuit_proveedor || '',
      cuit_rec: d.cuit_receptor || '',
      concepto: d.concepto || '',
      categoria: catKey,
      alicuota,
      total,
      neto,
      iva,
      cae: d.cae || '',
      confianza: d.confianza || 0,
    };
  };

  const updateForm = (key, val) => {
    setForm(f => {
      const updated = { ...f, [key]: val };
      // Auto-recalc
      if (key === 'categoria') {
        updated.alicuota = CATEGORIES[val]?.alicuota ?? 21;
        if (updated.total > 0) {
          updated.neto = updated.total / (1 + updated.alicuota/100);
          updated.iva = updated.total - updated.neto;
        }
      }
      if (key === 'alicuota' || key === 'total') {
        const a = parseFloat(key === 'alicuota' ? val : updated.alicuota) || 0;
        const t = parseFloat(key === 'total' ? val : updated.total) || 0;
        if (updated.tipo === 'C' || a === 0) { updated.neto = t; updated.iva = 0; }
        else { updated.neto = t / (1 + a/100); updated.iva = t - updated.neto; }
      }
      if (key === 'neto') {
        const n = parseFloat(val) || 0;
        const a = parseFloat(updated.alicuota) || 0;
        updated.iva = n * a / 100;
        updated.total = n + updated.iva;
      }
      if (key === 'tipo' && val === 'C') {
        updated.alicuota = 0; updated.iva = 0; updated.neto = updated.total;
      }
      return updated;
    });
  };

  const confirmEntry = () => {
    const entry = {
      id: Date.now(),
      fecha: form.fecha,
      tipo: form.tipo,
      nro: form.nro,
      proveedor: form.proveedor,
      cuit: form.cuit,
      cuit_rec: form.cuit_rec,
      concepto: form.concepto,
      categoria: form.categoria,
      alicuota: parseFloat(form.alicuota),
      neto: parseFloat(form.neto) || 0,
      iva: parseFloat(form.iva) || 0,
      total: parseFloat(form.total) || 0,
      cae: form.cae,
    };
    setModal(null);
    if (resolveRef.current) { resolveRef.current(entry); resolveRef.current = null; }
    showToast('✅', `${entry.proveedor || 'Comprobante'} cargado`);
  };

  const cancelModal = () => {
    setModal(null);
    if (resolveRef.current) { resolveRef.current(null); resolveRef.current = null; }
  };

  const removeEntry = (id) => setEntries(e => e.filter(x => x.id !== id));

  const filtered = entries.filter(e => {
    const ms = !search || e.proveedor?.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'all' || String(e.alicuota) === filter;
    return ms && mf;
  });

  const totalNeto = entries.reduce((s,e)=>s+e.neto,0);
  const totalIva  = entries.reduce((s,e)=>s+e.iva,0);
  const totalComp = entries.reduce((s,e)=>s+e.total,0);

  const exportCSV = () => {
    if (!entries.length) return showToast('⚠️','No hay datos',true);
    const h = ['#','Fecha','Tipo','Comprobante','Proveedor','CUIT Prov','CUIT Rec','Concepto','Categoría','Alícuota','Neto','IVA CF','Total','CAE'];
    const rows = entries.map((e,i)=>[i+1,e.fecha,e.tipo,e.nro,e.proveedor,e.cuit,e.cuit_rec,e.concepto,CATEGORIES[e.categoria]?.label||'',e.alicuota+'%',e.neto.toFixed(2),e.iva.toFixed(2),e.total.toFixed(2),e.cae]);
    const tot = ['','','','','','','','','','TOTAL',totalNeto.toFixed(2),totalIva.toFixed(2),totalComp.toFixed(2),''];
    const csv = [h,...rows,tot].map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    a.download = `LibroIVA_Compras_${period.replace('/','_')}.csv`;
    a.click();
    showToast('📊','Excel exportado');
  };

  const previewUrl = modal?.file && modal.file.type?.startsWith('image/')
    ? URL.createObjectURL(modal.file) : null;

  return (
    <>
      <Head><title>ContaAI — Liquidador IVA</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#0a0a0f;color:#e8e8f0;font-family:'Syne',sans-serif;min-height:100vh;}
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#2a2a3d;border-radius:3px;}
      `}</style>

      <div style={{position:'fixed',inset:0,backgroundImage:'linear-gradient(rgba(110,231,183,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(110,231,183,0.03) 1px,transparent 1px)',backgroundSize:'40px 40px',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'fixed',width:600,height:600,background:'rgba(110,231,183,0.06)',borderRadius:'50%',filter:'blur(120px)',top:-200,right:-200,pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'fixed',width:400,height:400,background:'rgba(129,140,248,0.06)',borderRadius:'50%',filter:'blur(120px)',bottom:-100,left:-100,pointerEvents:'none',zIndex:0}}/>

      <div style={{position:'relative',zIndex:1,maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>

        {/* HEADER */}
        <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'28px 0',borderBottom:'1px solid #2a2a3d',marginBottom:32}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,background:'linear-gradient(135deg,#6ee7b7,#818cf8)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>⚡</div>
            <div style={{fontFamily:'serif',fontSize:22}}>Conta<span style={{color:'#6ee7b7'}}>AI</span></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <select value={period} onChange={e=>setPeriod(e.target.value)} style={{background:'#12121a',border:'1px solid #2a2a3d',borderRadius:10,padding:'8px 14px',color:'#e8e8f0',fontFamily:'Syne,sans-serif',fontSize:13,cursor:'pointer',outline:'none'}}>
              {['05/2026','04/2026','03/2026','02/2026','01/2026','12/2025'].map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <span style={{fontSize:12,color:'#6b6b8a',fontFamily:'monospace'}}>Libro IVA Compras</span>
          </div>
        </header>

        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:28}}>
          {[
            {label:'Comprobantes', val:entries.length, color:'#e8e8f0', sub:'del período'},
            {label:'Neto Gravado', val:'$ '+fmt(totalNeto), color:'#6ee7b7', sub:'base imponible'},
            {label:'IVA Crédito Fiscal', val:'$ '+fmt(totalIva), color:'#818cf8', sub:'a computar'},
            {label:'Total Compras', val:'$ '+fmt(totalComp), color:'#fbbf24', sub:'incl. IVA'},
          ].map(s=>(
            <div key={s.label} style={{background:'#12121a',border:'1px solid #2a2a3d',borderRadius:16,padding:20}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:8}}>{s.label}</div>
              <div style={{fontFamily:'monospace',fontSize:20,fontWeight:500,color:s.color}}>{s.val}</div>
              <div style={{fontSize:11,color:'#6b6b8a',marginTop:4,fontFamily:'monospace'}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:24,alignItems:'start'}}>

          {/* UPLOAD PANEL */}
          <div style={{background:'#12121a',border:'1px solid #2a2a3d',borderRadius:20,padding:24,position:'sticky',top:24}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:16}}>📎 Cargar Comprobantes</div>

            <div
              onDrop={onDrop}
              onDragOver={e=>e.preventDefault()}
              onClick={()=>fileInputRef.current?.click()}
              style={{border:'2px dashed #2a2a3d',borderRadius:16,padding:'28px 16px',textAlign:'center',cursor:'pointer',background:'#0a0a0f',transition:'all 0.2s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#6ee7b7';e.currentTarget.style.background='rgba(110,231,183,0.03)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#2a2a3d';e.currentTarget.style.background='#0a0a0f'}}
            >
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple style={{display:'none'}} onChange={e=>handleFiles(e.target.files)}/>
              <div style={{fontSize:32,marginBottom:10}}>🧾</div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>Arrastrá las fotos aquí</div>
              <div style={{fontSize:12,color:'#6b6b8a',lineHeight:1.5}}>Imágenes desde <strong style={{color:'#6ee7b7'}}>WhatsApp</strong>,<br/>fotos, escaneos o PDFs</div>
            </div>

            {/* Queue */}
            <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:8,maxHeight:280,overflowY:'auto'}}>
              {queue.map((item,i)=>(
                <div key={i} style={{background:'#1a1a26',border:'1px solid #2a2a3d',borderRadius:10,padding:'10px 12px',display:'flex',alignItems:'center',gap:10,fontSize:12}}>
                  <div style={{width:34,height:34,borderRadius:6,background:'#2a2a3d',flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {item.file.type?.startsWith('image/') ? <img src={URL.createObjectURL(item.file)} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : '📄'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:2}}>{item.file.name}</div>
                    <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#6b6b8a'}}>
                      <div style={{width:6,height:6,borderRadius:'50%',background:item.status==='done'?'#6ee7b7':item.status==='processing'?'#fbbf24':item.status==='error'?'#f87171':'#6b6b8a',animation:item.status==='processing'?'pulse 1s infinite':undefined}}/>
                      {item.status==='pending'?'Pendiente':item.status==='processing'?'Procesando...':item.status==='done'?'Listo ✓':'Error'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={processAll} disabled={processing || !queue.some(q=>q.status==='pending')}
              style={{width:'100%',marginTop:14,padding:14,background:'linear-gradient(135deg,#6ee7b7,#34d399)',color:'#0a0a0f',border:'none',borderRadius:12,fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,cursor:'pointer',opacity:(processing||!queue.some(q=>q.status==='pending'))?0.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {processing ? '⏳ Procesando...' : '✨ Procesar con IA'}
            </button>
            <button onClick={exportCSV} style={{width:'100%',marginTop:10,padding:12,background:'transparent',color:'#6b6b8a',border:'1px solid #2a2a3d',borderRadius:12,fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              📊 Exportar Excel
            </button>

            {/* Alícuotas ref */}
            <div style={{marginTop:18,padding:14,background:'#0a0a0f',border:'1px solid #2a2a3d',borderRadius:12}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:10}}>📋 Alícuotas</div>
              {[['Servicios públicos','27%','#f472b6'],['Servicios / Honorarios','21%','#6ee7b7'],['Insumos básicos','10,5%','#fbbf24'],['Monotributo / Exento','0%','#6b6b8a']].map(([l,v,c])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:11,fontFamily:'monospace',marginBottom:4}}>
                  <span style={{color:'#6b6b8a'}}>{l}</span><span style={{color:c,fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div style={{background:'#12121a',border:'1px solid #2a2a3d',borderRadius:20,overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #2a2a3d',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <div style={{background:'#0a0a0f',border:'1px solid #2a2a3d',borderRadius:10,padding:'7px 12px',display:'flex',alignItems:'center',gap:7,fontSize:13}}>
                  <span>🔍</span>
                  <input placeholder="Buscar proveedor..." value={search} onChange={e=>setSearch(e.target.value)} style={{background:'none',border:'none',outline:'none',color:'#e8e8f0',fontFamily:'Syne,sans-serif',fontSize:13,width:160}}/>
                </div>
                {['all','21','10.5','27'].map(f=>(
                  <button key={f} onClick={()=>setFilter(f)} style={{padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',border:`1px solid ${filter===f?'#6ee7b7':'#2a2a3d'}`,background:filter===f?'rgba(110,231,183,0.1)':'transparent',color:filter===f?'#6ee7b7':'#6b6b8a',fontFamily:'Syne,sans-serif'}}>
                    {f==='all'?'Todos':f+'%'}
                  </button>
                ))}
              </div>
              <button onClick={exportCSV} style={{padding:'7px 14px',background:'#1a1a26',border:'1px solid #2a2a3d',borderRadius:10,color:'#e8e8f0',fontFamily:'Syne,sans-serif',fontSize:12,fontWeight:600,cursor:'pointer'}}>↓ Excel</button>
            </div>

            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#0a0a0f',borderBottom:'1px solid #2a2a3d'}}>
                    {['#','Fecha','Comprobante','Proveedor','CUIT','Concepto','Categoría','Alíc.','Neto','IVA CF','Total',''].map(h=>(
                      <th key={h} style={{padding:'10px 14px',textAlign:['Neto','IVA CF','Total'].includes(h)?'right':'left',fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b6b8a',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={12} style={{padding:'60px 20px',textAlign:'center',color:'#6b6b8a'}}>
                      <div style={{fontSize:40,marginBottom:12,opacity:0.5}}>🤖</div>
                      <div style={{fontSize:15,fontWeight:700,color:'#e8e8f0',opacity:0.4,marginBottom:6}}>{entries.length>0?'Sin resultados':'Listo para procesar'}</div>
                      <div style={{fontSize:12,lineHeight:1.6}}>{entries.length>0?'Cambiá los filtros':'Cargá las fotos y presioná Procesar con IA'}</div>
                    </td></tr>
                  ) : filtered.map((e,i)=>(
                    <tr key={e.id} style={{borderBottom:'1px solid rgba(42,42,61,0.5)',transition:'background 0.15s'}} onMouseEnter={ev=>ev.currentTarget.style.background='#1a1a26'} onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
                      <td style={{padding:'12px 14px',color:'#6b6b8a',fontFamily:'monospace'}}>{i+1}</td>
                      <td style={{padding:'12px 14px',fontFamily:'monospace',fontSize:11,color:'#6b6b8a'}}>{e.fecha}</td>
                      <td style={{padding:'12px 14px',fontFamily:'monospace',fontSize:11}}>Fac.{e.tipo} {e.nro}</td>
                      <td style={{padding:'12px 14px',fontWeight:600,maxWidth:140,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.proveedor}</td>
                      <td style={{padding:'12px 14px',fontFamily:'monospace',fontSize:11,color:'#6b6b8a'}}>{e.cuit}</td>
                      <td style={{padding:'12px 14px',fontSize:11,color:'#6b6b8a',maxWidth:120,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={e.concepto}>{e.concepto||'—'}</td>
                      <td style={{padding:'12px 14px'}}>
                        <span style={{padding:'2px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:`${CAT_COLORS[e.categoria]}22`,color:CAT_COLORS[e.categoria],border:`1px solid ${CAT_COLORS[e.categoria]}44`}}>
                          {CATEGORIES[e.categoria]?.label||e.categoria}
                        </span>
                      </td>
                      <td style={{padding:'12px 14px'}}>
                        <span style={{fontFamily:'monospace',fontSize:12,padding:'2px 8px',borderRadius:6,background:'rgba(110,231,183,0.1)',color:'#6ee7b7'}}>{e.alicuota}%</span>
                      </td>
                      <td style={{padding:'12px 14px',textAlign:'right',fontFamily:'monospace',fontWeight:500}}>$ {fmt(e.neto)}</td>
                      <td style={{padding:'12px 14px',textAlign:'right',fontFamily:'monospace',color:'#6ee7b7'}}>$ {fmt(e.iva)}</td>
                      <td style={{padding:'12px 14px',textAlign:'right',fontFamily:'monospace',fontWeight:700}}>$ {fmt(e.total)}</td>
                      <td style={{padding:'12px 14px'}}>
                        <button onClick={()=>removeEntry(e.id)} style={{padding:'4px 8px',background:'transparent',border:'1px solid #2a2a3d',borderRadius:6,color:'#6b6b8a',fontSize:11,cursor:'pointer'}}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer totals */}
            <div style={{padding:'14px 20px',borderTop:'1px solid #2a2a3d',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,background:'#0a0a0f'}}>
              {[
                {l:'Neto 21%', v:entries.filter(e=>e.alicuota===21).reduce((s,e)=>s+e.neto,0), c:'#6ee7b7'},
                {l:'Neto 10,5%', v:entries.filter(e=>e.alicuota===10.5).reduce((s,e)=>s+e.neto,0), c:'#fbbf24'},
                {l:'Neto 27%', v:entries.filter(e=>e.alicuota===27).reduce((s,e)=>s+e.neto,0), c:'#f472b6'},
                {l:'Total IVA CF', v:totalIva, c:'#818cf8'},
              ].map(s=>(
                <div key={s.l}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:4}}>{s.l}</div>
                  <div style={{fontFamily:'monospace',fontSize:14,fontWeight:500,color:s.c}}>$ {fmt(s.v)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div onClick={cancelModal} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#12121a',border:'1px solid #2a2a3d',borderRadius:24,width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{padding:'18px 22px',borderBottom:'1px solid #2a2a3d',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:16,fontWeight:700}}>✅ Revisar comprobante</div>
              <button onClick={cancelModal} style={{width:30,height:30,background:'#1a1a26',border:'1px solid #2a2a3d',borderRadius:8,cursor:'pointer',color:'#6b6b8a',fontSize:14}}>✕</button>
            </div>
            <div style={{padding:22}}>
              {previewUrl && <img src={previewUrl} style={{width:'100%',maxHeight:180,objectFit:'contain',borderRadius:12,border:'1px solid #2a2a3d',marginBottom:16,background:'#0a0a0f'}}/>}

              {/* Confidence */}
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                <span style={{fontSize:11,color:'#6b6b8a'}}>Confianza IA:</span>
                <div style={{width:80,height:4,background:'#2a2a3d',borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${(form.confianza||0)*100}%`,background:'#6ee7b7',borderRadius:2}}/>
                </div>
                <span style={{fontFamily:'monospace',fontSize:10,color:'#6b6b8a'}}>{Math.round((form.confianza||0)*100)}%</span>
                {form.tipo==='B' && <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:'rgba(251,191,36,0.1)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.3)'}}>⚠️ Factura B — IVA incluido</span>}
                {form.tipo==='C' && <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:'rgba(107,107,138,0.1)',color:'#6b6b8a',border:'1px solid #2a2a3d'}}>ℹ️ Monotributo</span>}
              </div>

              {/* Form fields */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {[
                  {label:'Fecha', key:'fecha', placeholder:'DD/MM/YYYY', span:1},
                  {label:'Tipo', key:'tipo', type:'select', options:['A','B','C','M'], span:1},
                  {label:'Nro. Comprobante', key:'nro', placeholder:'0001-00000001', span:2},
                  {label:'Proveedor', key:'proveedor', placeholder:'Razón social', span:2},
                  {label:'CUIT Proveedor', key:'cuit', placeholder:'20-12345678-9', span:1},
                  {label:'CUIT Receptor', key:'cuit_rec', placeholder:'20-12345678-9', span:1},
                  {label:'Concepto / Descripción', key:'concepto', placeholder:'Descripción del bien o servicio', span:2},
                ].map(f=>(
                  <div key={f.key} style={{gridColumn:`span ${f.span}`}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:5}}>{f.label}</label>
                    {f.type==='select' ? (
                      <select value={form[f.key]||''} onChange={e=>updateForm(f.key,e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a3d',borderRadius:10,padding:'9px 11px',color:'#e8e8f0',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}>
                        {f.options.map(o=><option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={form[f.key]||''} onChange={e=>updateForm(f.key,e.target.value)} placeholder={f.placeholder} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a3d',borderRadius:10,padding:'9px 11px',color:'#e8e8f0',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/>
                    )}
                  </div>
                ))}

                {/* Categoria */}
                <div style={{gridColumn:'span 2'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:5}}>Categoría ✨ IA</label>
                  <select value={form.categoria||'otros'} onChange={e=>updateForm('categoria',e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a3d',borderRadius:10,padding:'9px 11px',color:'#e8e8f0',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}>
                    {Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v.label} ({v.alicuota}%)</option>)}
                  </select>
                </div>

                {/* Alicuota + Total */}
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:5}}>Alícuota ✨ IA</label>
                  <select value={form.alicuota||21} onChange={e=>updateForm('alicuota',e.target.value)} style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a3d',borderRadius:10,padding:'9px 11px',color:'#e8e8f0',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}>
                    {[21,10.5,27,0].map(a=><option key={a} value={a}>{a}%</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:5}}>Total Factura</label>
                  <input type="number" value={form.total||0} onChange={e=>updateForm('total',e.target.value)} step="0.01" style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a3d',borderRadius:10,padding:'9px 11px',color:'#e8e8f0',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/>
                </div>

                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:5}}>Neto Gravado ✨ IA</label>
                  <input type="number" value={form.neto||0} onChange={e=>updateForm('neto',e.target.value)} step="0.01" style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a3d',borderRadius:10,padding:'9px 11px',color:'#6ee7b7',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'#6b6b8a',marginBottom:5}}>IVA Crédito Fiscal</label>
                  <input type="number" value={form.iva||0} onChange={e=>updateForm('iva',e.target.value)} step="0.01" style={{width:'100%',background:'#0a0a0f',border:'1px solid #2a2a3d',borderRadius:10,padding:'9px 11px',color:'#818cf8',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/>
                </div>
              </div>
            </div>
            <div style={{padding:'14px 22px',borderTop:'1px solid #2a2a3d',display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={cancelModal} style={{padding:'10px 20px',background:'transparent',color:'#6b6b8a',border:'1px solid #2a2a3d',borderRadius:10,fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
              <button onClick={confirmEntry} style={{padding:'10px 24px',background:'linear-gradient(135deg,#6ee7b7,#34d399)',color:'#0a0a0f',border:'none',borderRadius:10,fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer'}}>✓ Confirmar y guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{position:'fixed',bottom:24,right:24,background:'#12121a',border:`1px solid ${toast.isErr?'#f87171':'#6ee7b7'}`,borderRadius:12,padding:'13px 20px',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:10,zIndex:200,boxShadow:'0 8px 32px rgba(0,0,0,0.4)',animation:'slideUp 0.3s ease'}}>
          <span>{toast.icon}</span><span>{toast.msg}</span>
        </div>
      )}

      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}
