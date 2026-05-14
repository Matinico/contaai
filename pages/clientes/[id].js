import Head from 'next/head';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../lib/auth-context';
import { authFetch } from '../../lib/auth-fetch';
import { useRole } from '../../lib/use-role';
import { useRouter } from 'next/router';
import Link from 'next/link';

const C = {
  bg:     '#f0f2f5',
  navy:   '#1a3a5c',
  accent: '#7eb8f7',
  white:  '#ffffff',
  text:   '#1e293b',
  muted:  '#64748b',
  border: '#dde1e7',
  green:  '#16a34a',
  red:    '#dc2626',
  yellow: '#d97706',
  font:   "system-ui,-apple-system,'Segoe UI',sans-serif",
  mono:   "'Courier New',Courier,monospace",
};

const CATEGORIES = {
  servicios:     { label: 'Servicios',      alicuota: 21   },
  honorarios:    { label: 'Honorarios',     alicuota: 21   },
  alquileres:    { label: 'Alquileres',     alicuota: 21   },
  insumos:       { label: 'Insumos',        alicuota: 10.5 },
  servicios_pub: { label: 'Serv. Públicos', alicuota: 27   },
  transporte:    { label: 'Transporte',     alicuota: 21   },
  repuestos:     { label: 'Repuestos',      alicuota: 21   },
  otros:         { label: 'Otros',          alicuota: 21   },
};

const PERIODS = ['05/2026','04/2026','03/2026','02/2026','01/2026','12/2025','11/2025','10/2025'];

const inp    = { width: '100%', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '8px 10px', color: C.text, fontFamily: C.mono, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const lbl    = { display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' };
const advLbl = { fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };
const advInp = w => ({ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 6, padding: '6px 8px', color: C.text, fontSize: 12, outline: 'none', fontFamily: C.font, width: w });

function fmt(n) { return (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatCuit(v) { const d = String(v||'').replace(/\D/g,'').slice(0,11); if(d.length<=2)return d; if(d.length<=10)return`${d.slice(0,2)}-${d.slice(2)}`; return`${d.slice(0,2)}-${d.slice(2,10)}-${d.slice(10)}`; }
function formatFecha(v) { const d = String(v||'').replace(/\D/g,'').slice(0,8); if(d.length<=2)return d; if(d.length<=4)return`${d.slice(0,2)}/${d.slice(2)}`; return`${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`; }

function fileToBase64(file) {
  if (file.type === 'application/pdf') {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200; let w = img.width, h = img.height;
      if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX; } else { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      res(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]); URL.revokeObjectURL(url);
    };
    img.onerror = rej; img.src = url;
  });
}

function xc(v, t = 'String') { const s = String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); return `<Cell><Data ss:Type="${t}">${s}</Data></Cell>`; }
function xh(v) { return `<Cell ss:StyleID="H"><Data ss:Type="String">${String(v ?? '').replace(/&/g, '&amp;')}</Data></Cell>`; }
function xr(...c) { return `<Row>${c.join('')}</Row>`; }

function exportXLS(compras, ventas, period, clienteNombre) {
  if (!compras.length && !ventas.length) return;
  const cHdr = xr(...['#', 'Fecha', 'Tipo', 'Comprobante', 'Proveedor', 'CUIT Prov.', 'CUIT Rec.', 'Concepto', 'Categoría', 'Alíc.%', 'Neto', 'IVA CF', 'Total', 'CAE'].map(xh));
  const cRows = compras.map((e, i) => xr(xc(i + 1, 'Number'), xc(e.fecha), xc(e.tipo), xc(`Fac.${e.tipo} ${e.nro}`), xc(e.proveedor), xc(e.cuit || ''), xc(e.cuit_rec || ''), xc(e.concepto), xc(CATEGORIES[e.categoria]?.label || e.categoria), xc(e.alicuota, 'Number'), xc(e.neto, 'Number'), xc(e.iva, 'Number'), xc(e.total, 'Number'), xc(e.cae || ''))).join('');
  const cTot = xr(xh(''), xh(''), xh(''), xh(''), xh(''), xh(''), xh(''), xh(''), xh(''), xh('TOTAL'), xc(compras.reduce((s, e) => s + e.neto, 0), 'Number'), xc(compras.reduce((s, e) => s + e.iva, 0), 'Number'), xc(compras.reduce((s, e) => s + e.total, 0), 'Number'), xh(''));
  const vHdr = xr(...['#', 'Fecha', 'Tipo', 'Comprobante', 'Cliente', 'CUIT Cliente', 'Concepto', 'Categoría', 'Alíc.%', 'Neto', 'IVA DF', 'Total', 'CAE'].map(xh));
  const vRows = ventas.map((e, i) => xr(xc(i + 1, 'Number'), xc(e.fecha), xc(e.tipo), xc(`Fac.${e.tipo} ${e.nro}`), xc(e.cliente), xc(e.cuit_cli || ''), xc(e.concepto), xc(CATEGORIES[e.categoria]?.label || e.categoria), xc(e.alicuota, 'Number'), xc(e.neto, 'Number'), xc(e.iva, 'Number'), xc(e.total, 'Number'), xc(e.cae || ''))).join('');
  const vTot = xr(xh(''), xh(''), xh(''), xh(''), xh(''), xh(''), xh(''), xh('TOTAL'), xc(ventas.reduce((s, e) => s + e.neto, 0), 'Number'), xc(ventas.reduce((s, e) => s + e.iva, 0), 'Number'), xc(ventas.reduce((s, e) => s + e.total, 0), 'Number'), xh(''));
  const df = ventas.reduce((s, e) => s + e.iva, 0), cf = compras.reduce((s, e) => s + e.iva, 0), saldo = df - cf;
  const posRows = [xr(xh('Concepto'), xh('Importe ARS')), xr(xc('Débito Fiscal (IVA Ventas)'), xc(df, 'Number')), xr(xc('Crédito Fiscal (IVA Compras)'), xc(cf, 'Number')), xr(xc(''), xc('')), xr(xh(saldo >= 0 ? 'SALDO A PAGAR' : 'SALDO A FAVOR'), xc(Math.abs(saldo), 'Number'))].join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="H"><Font ss:Bold="1"/></Style></Styles><Worksheet ss:Name="IVA Compras"><Table>${cHdr}${cRows}${cTot}</Table></Worksheet><Worksheet ss:Name="IVA Ventas"><Table>${vHdr}${vRows}${vTot}</Table></Worksheet><Worksheet ss:Name="Posición IVA"><Table>${posRows}</Table></Worksheet></Workbook>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
  a.download = `ContaAI_LibroIVA_${clienteNombre.replace(/\s+/g, '_')}_${period.replace('/', '_')}.xls`;
  a.click();
}

async function exportARCA(compras, ventas, period) {
  if (!compras.length && !ventas.length) return;
  const [mm, yyyy] = period.split('/');
  const yyyymm = `${yyyy}${mm}`;

  const JSZip = (await import('jszip')).default;
  const zip   = new JSZip();

  const CBTE_COD = { A: '001', B: '006', C: '011', M: '051' };
  const ALI_COD  = { '21': '0005', '10.5': '0004', '27': '0006', '0': '0003' };
  const Z15      = '000000000000000';

  const padLd = (v, n) => String(v ?? '').replace(/\D/g, '').padStart(n, '0').slice(-n);
  const padR  = (v, n) => String(v ?? '').slice(0, n).padEnd(n, ' ');
  const fmtAmt = n => String(Math.round(Math.abs(Number(n) || 0) * 100)).padStart(15, '0');

  function parseFecha(f) {
    if (!f) return '00000000';
    if (f.includes('/')) { const p = f.split('/'); return `${p[2]}${p[1]}${p[0]}`; }
    return f.replace(/-/g, '');
  }

  function parseNro(nro) {
    if (nro && nro.includes('-')) {
      const p = nro.split('-');
      return { pto: padLd(p[0], 5), comp: padLd(p[1], 20) };
    }
    return { pto: '00000', comp: padLd(nro || '0', 20) };
  }

  function cantAli(e) {
    if (!['A', 'M'].includes(e.tipo)) return '0';
    const hasBreakdown = (e.neto21 || 0) + (e.neto105 || 0) + (e.neto27 || 0) > 0;
    if (hasBreakdown) {
      return String(((e.neto21 || 0) > 0 ? 1 : 0) + ((e.neto105 || 0) > 0 ? 1 : 0) + ((e.neto27 || 0) > 0 ? 1 : 0));
    }
    return (e.neto || 0) > 0 ? '1' : '0';
  }

  function buildCbte(e, esVenta) {
    const { pto, comp } = parseNro(e.nro);
    const docCuit = padLd(esVenta ? (e.cuit_cli || '') : (e.cuit || ''), 20);
    const denom   = padR(esVenta ? (e.cliente || '') : (e.proveedor || ''), 30);
    const isTipoAM = ['A', 'M'].includes(e.tipo);
    const cfdf    = isTipoAM ? fmtAmt(e.iva) : Z15;
    return [
      parseFecha(e.fecha),       // 8
      CBTE_COD[e.tipo] || '006', // 3
      pto,                       // 5
      comp,                      // 20
      ' '.repeat(16),            // 16 Despacho Importación (espacios)
      '80',                      // 2
      docCuit,                   // 20
      denom,                     // 30
      fmtAmt(e.total),           // 15 Importe Total
      Z15,                       // 15 No Gravado
      Z15,                       // 15 Exento
      Z15,                       // 15 Percep IVA
      Z15,                       // 15 Percep Otros Nac
      Z15,                       // 15 Percep IIBB
      Z15,                       // 15 Percep Municipal
      Z15,                       // 15 Imp Internos
      'PES',                     // 3
      '0001000000',              // 10 Tipo de Cambio
      cantAli(e),                // 1
      ' ',                       // 1 Cod Operación
      cfdf,                      // 15 CF/DF Computable
      Z15,                       // 15 Otros Tributos
      '0'.repeat(11),            // 11 CUIT Emisor
      ' '.repeat(30),            // 30 Denominación Emisor
      Z15,                       // 15 IVA Comisión
    ].join('');
  }

  function buildAliLines(e, esVenta) {
    if (!['A', 'M'].includes(e.tipo)) return [];
    const { pto, comp } = parseNro(e.nro);
    const docCuit = padLd(esVenta ? (e.cuit_cli || '') : (e.cuit || ''), 20);
    const cod     = CBTE_COD[e.tipo] || '001';
    const lines   = [];
    const addLine = (neto, iva, pct) => {
      if ((neto || 0) <= 0 && (iva || 0) <= 0) return;
      lines.push([cod, pto, comp, '80', docCuit, fmtAmt(neto), ALI_COD[String(pct)] || '0005', fmtAmt(iva)].join(''));
    };
    const hasBreakdown = (e.neto21 || 0) + (e.neto105 || 0) + (e.neto27 || 0) > 0;
    if (hasBreakdown) {
      addLine(e.neto21,  e.iva21,  '21');
      addLine(e.neto105, e.iva105, '10.5');
      addLine(e.neto27,  e.iva27,  '27');
    } else {
      addLine(e.neto, e.iva, String(e.alicuota || '21'));
    }
    return lines;
  }

  function encodeWin1252(str) {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); bytes[i] = c < 256 ? c : 0x3F; }
    return bytes;
  }

  const makeFile = lines => encodeWin1252(lines.join('\r\n'));

  zip.file(`LIBRO_IVA_DIGITAL_COMPRAS_ORDINARIAS_CBTE_${yyyymm}.txt`,      makeFile(compras.map(e => buildCbte(e, false))));
  zip.file(`LIBRO_IVA_DIGITAL_COMPRAS_ORDINARIAS_ALICUOTAS_${yyyymm}.txt`, makeFile(compras.flatMap(e => buildAliLines(e, false))));
  zip.file(`LIBRO_IVA_DIGITAL_VENTAS_CBTE_${yyyymm}.txt`,                  makeFile(ventas.map(e => buildCbte(e, true))));
  zip.file(`LIBRO_IVA_DIGITAL_VENTAS_ALICUOTAS_${yyyymm}.txt`,             makeFile(ventas.flatMap(e => buildAliLines(e, true))));

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ARCA_LibroIVA_${yyyymm}.zip`;
  a.click();
}

async function exportPDF(entries, tipo, period, clienteNombre) {
  if (!entries.length) return;

  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const isC  = tipo === 'compras';
  const fmtN = n => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const today = new Date().toLocaleDateString('es-AR');
  const title = isC ? 'Libro IVA Compras' : 'Libro IVA Ventas';

  function breakdown(e) {
    const hasB = (e.neto21||0) + (e.neto105||0) + (e.neto27||0) > 0;
    const a    = Number(e.alicuota);
    return {
      n21:  hasB ? (e.neto21||0)  : (a===21   ? e.neto : 0),
      i21:  hasB ? (e.iva21||0)   : (a===21   ? e.iva  : 0),
      n105: hasB ? (e.neto105||0) : (a===10.5 ? e.neto : 0),
      i105: hasB ? (e.iva105||0)  : (a===10.5 ? e.iva  : 0),
      n27:  hasB ? (e.neto27||0)  : (a===27   ? e.neto : 0),
      i27:  hasB ? (e.iva27||0)   : (a===27   ? e.iva  : 0),
      noG:  hasB ? 0              : (a===0    ? e.neto : 0),
    };
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(13); doc.setTextColor(26, 58, 92);
  doc.text(`${title} — ${clienteNombre}`, 8, 13);
  doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text(`Período: ${period}   ·   ${entries.length} comprobante${entries.length!==1?'s':''}   ·   Generado: ${today}`, 8, 19);

  const NAVY = [26, 58, 92];
  const FOOT = [241, 245, 249];
  const headStyles = { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7, cellPadding: 1.5 };
  const footStyles = { fillColor: FOOT, textColor: [30,41,59], fontStyle: 'bold', fontSize: 7, cellPadding: 1.5 };
  const baseStyles = { fontSize: 7, cellPadding: 1.5, overflow: 'ellipsize' };
  const R = { halign: 'right', fontStyle: 'normal' };

  if (isC) {
    const tots = { n21:0, i21:0, n105:0, i105:0, n27:0, i27:0, noG:0, total:0 };
    const body = entries.map(e => {
      const b = breakdown(e);
      tots.n21 += b.n21; tots.i21 += b.i21; tots.n105 += b.n105; tots.i105 += b.i105;
      tots.n27 += b.n27; tots.i27 += b.i27; tots.noG += b.noG; tots.total += e.total;
      const aliLabel = [b.n21>0&&'21%', b.n105>0&&'10,5%', b.n27>0&&'27%'].filter(Boolean).join('/') || `${e.alicuota}%`;
      return [e.fecha, e.tipo, `F${e.tipo} ${e.nro}`, e.proveedor||'', e.cuit||'',
        CATEGORIES[e.categoria]?.label||e.categoria, aliLabel,
        fmtN(b.n21), fmtN(b.i21), fmtN(b.n105), fmtN(b.i105),
        fmtN(b.n27), fmtN(b.i27), fmtN(b.noG), fmtN(0), fmtN(e.total)];
    });
    const foot = [['','','','','','','TOTAL',
      fmtN(tots.n21), fmtN(tots.i21), fmtN(tots.n105), fmtN(tots.i105),
      fmtN(tots.n27), fmtN(tots.i27), fmtN(tots.noG), fmtN(0), fmtN(tots.total)]];
    doc.autoTable({
      startY: 23,
      head: [['Fecha','Tipo','Comprobante','Proveedor','CUIT','Categoría','Alíc%','Neto 21%','IVA 21%','Neto 10,5%','IVA 10,5%','Neto 27%','IVA 27%','No Gravado','Exento','Total']],
      body, foot, headStyles, footStyles, styles: baseStyles,
      columnStyles: {
        0:{cellWidth:18}, 1:{cellWidth:7}, 2:{cellWidth:22}, 3:{cellWidth:28},
        4:{cellWidth:22}, 5:{cellWidth:16}, 6:{cellWidth:18,...R},
        7:{cellWidth:18,...R}, 8:{cellWidth:15,...R}, 9:{cellWidth:18,...R},
        10:{cellWidth:15,...R}, 11:{cellWidth:14,...R}, 12:{cellWidth:12,...R},
        13:{cellWidth:14,...R}, 14:{cellWidth:12,...R}, 15:{cellWidth:18,...R},
      },
      margin: { left: 8, right: 8 },
    });
  } else {
    const tots = { n21:0, i21:0, n105:0, i105:0, total:0 };
    const body = entries.map(e => {
      const b = breakdown(e);
      tots.n21 += b.n21; tots.i21 += b.i21; tots.n105 += b.n105; tots.i105 += b.i105; tots.total += e.total;
      return [e.fecha, e.tipo, `F${e.tipo} ${e.nro}`, e.cliente||'', e.cuit_cli||'',
        fmtN(b.n21), fmtN(b.i21), fmtN(b.n105), fmtN(b.i105), fmtN(e.total)];
    });
    const foot = [['','','','','TOTAL',
      fmtN(tots.n21), fmtN(tots.i21), fmtN(tots.n105), fmtN(tots.i105), fmtN(tots.total)]];
    doc.autoTable({
      startY: 23,
      head: [['Fecha','Tipo','Comprobante','Cliente','CUIT','Neto 21%','IVA 21%','Neto 10,5%','IVA 10,5%','Total']],
      body, foot, headStyles, footStyles, styles: baseStyles,
      columnStyles: {
        0:{cellWidth:16}, 1:{cellWidth:8}, 2:{cellWidth:28}, 3:{cellWidth:50},
        4:{cellWidth:28}, 5:{cellWidth:24,...R}, 6:{cellWidth:20,...R},
        7:{cellWidth:24,...R}, 8:{cellWidth:20,...R}, 9:{cellWidth:24,...R},
      },
      margin: { left: 10, right: 10 },
    });
  }

  doc.save(`ContaAI_${isC?'Compras':'Ventas'}_${clienteNombre.replace(/\s+/g,'_')}_${period.replace('/','_')}.pdf`);
}

function calcBreakdown(neto, iva, alicuota) {
  const ali = Number(alicuota);
  return {
    neto21:  ali === 21   ? neto : 0,
    iva21:   ali === 21   ? iva  : 0,
    neto105: ali === 10.5 ? neto : 0,
    iva105:  ali === 10.5 ? iva  : 0,
    neto27:  ali === 27   ? neto : 0,
    iva27:   ali === 27   ? iva  : 0,
    noGrav:  ali === 0    ? neto : 0,
    exento:  0,
  };
}

function entryToDb(entry, libro, periodo, clienteId) {
  return { libro, periodo, cliente_id: clienteId, fecha: entry.fecha, tipo: entry.tipo, nro: entry.nro, proveedor: libro === 'ventas' ? (entry.cliente ?? '') : (entry.proveedor ?? ''), cuit: libro === 'ventas' ? (entry.cuit_cli ?? '') : (entry.cuit ?? ''), concepto: entry.concepto, categoria: entry.categoria, alicuota: entry.alicuota, neto: entry.neto, iva: entry.iva, total: entry.total, cae: entry.cae || null, neto_gravado_21: entry.neto21 ?? 0, iva_21: entry.iva21 ?? 0, neto_gravado_105: entry.neto105 ?? 0, iva_105: entry.iva105 ?? 0, neto_gravado_27: entry.neto27 ?? 0, iva_27: entry.iva27 ?? 0 };
}

function dbToEntry(row) {
  const base = { id: row.id, uploaded_by: row.uploaded_by ?? null, fecha: row.fecha ?? '', tipo: row.tipo ?? 'B', nro: row.nro ?? '', concepto: row.concepto ?? '', categoria: row.categoria ?? 'otros', alicuota: Number(row.alicuota ?? 21), neto: Number(row.neto ?? 0), iva: Number(row.iva ?? 0), total: Number(row.total ?? 0), cae: row.cae ?? '', neto21: Number(row.neto_gravado_21 ?? 0), iva21: Number(row.iva_21 ?? 0), neto105: Number(row.neto_gravado_105 ?? 0), iva105: Number(row.iva_105 ?? 0), neto27: Number(row.neto_gravado_27 ?? 0), iva27: Number(row.iva_27 ?? 0), noGrav: 0, exento: 0 };
  return row.libro === 'ventas'
    ? { ...base, cliente: row.proveedor ?? '', cuit_cli: row.cuit ?? '' }
    : { ...base, proveedor: row.proveedor ?? '', cuit: row.cuit ?? '', cuit_rec: '' };
}

export default function ClienteDetalle() {
  const { user, signOut } = useAuth();
  const { rol } = useRole({ redirectIfNoMembership: false });
  const router = useRouter();
  const { id } = router.query;
  const menuRef = useRef(null);
  const fileRef = useRef(null);
  const resolveRef = useRef(null);
  const entityResolveRef = useRef(null);

  const [menu,       setMenu]       = useState(false);
  const [cliente,    setCliente]    = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError,  setPageError]  = useState(null);
  const [mainTab,    setMainTab]    = useState('iva');
  const [activeTab,  setActiveTab]  = useState('compras');
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
  const [fechaDesde,     setFechaDesde]     = useState('');
  const [fechaHasta,     setFechaHasta]     = useState('');
  const [modal,          setModal]          = useState(null);
  const [form,           setForm]           = useState({});
  const [toast,          setToast]          = useState(null);
  const [period,         setPeriod]         = useState('05/2026');
  const [dbLoading,      setDbLoading]      = useState(false);
  const [entityModal,    setEntityModal]    = useState(null);
  const [entityForm,     setEntityForm]     = useState({ nombre: '' });
  const [editingId,      setEditingId]      = useState(null);
  const [advOpen,        setAdvOpen]        = useState(false);
  const [advCat,         setAdvCat]         = useState('');
  const [advMin,         setAdvMin]         = useState('');
  const [advMax,         setAdvMax]         = useState('');

  useEffect(() => { if (user === null) router.replace('/login'); }, [user, router]);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (user && id) {
      authFetch(`/api/clientes/${id}`)
        .then(r => r.json())
        .then(data => { if (data.error) setPageError(data.error); else setCliente(data); })
        .catch(() => setPageError('Error de red'))
        .finally(() => setPageLoading(false));
    }
  }, [user, id]);

  useEffect(() => {
    if (!user || !id) return;
    setComprasEntries([]); setVentasEntries([]); setDbLoading(true);
    Promise.all([
      authFetch(`/api/facturas?periodo=${encodeURIComponent(period)}&libro=compras&cliente_id=${id}`).then(r => r.json()),
      authFetch(`/api/facturas?periodo=${encodeURIComponent(period)}&libro=ventas&cliente_id=${id}`).then(r => r.json()),
    ]).then(([c, v]) => {
      setComprasEntries((c.data ?? []).map(dbToEntry));
      setVentasEntries((v.data ?? []).map(dbToEntry));
    }).catch(console.error).finally(() => setDbLoading(false));
  }, [user, id, period]);

  const isCompras  = activeTab === 'compras';
  const entries    = isCompras ? comprasEntries : ventasEntries;
  const queue      = isCompras ? comprasQueue : ventasQueue;
  const processing = isCompras ? comprasProc : ventasProc;
  const filter     = isCompras ? comprasFilter : ventasFilter;
  const setFilter  = isCompras ? setComprasFilter : setVentasFilter;
  const search     = isCompras ? comprasSearch : ventasSearch;
  const setSearch  = isCompras ? setComprasSearch : setVentasSearch;

  const filtered = entries.filter(e => {
    const name = isCompras ? (e.proveedor || '') : (e.cliente || '');
    const cuit = isCompras ? (e.cuit || '') : (e.cuit_cli || '');
    if (search) {
      const q = search.toLowerCase();
      if (!name.toLowerCase().includes(q) && !cuit.toLowerCase().includes(q)) return false;
    }
    if (filter !== 'all' && String(e.alicuota) !== filter) return false;
    if (advCat && e.categoria !== advCat) return false;
    if (advMin !== '' && e.total < parseFloat(advMin)) return false;
    if (advMax !== '' && e.total > parseFloat(advMax)) return false;
    if (fechaDesde || fechaHasta) {
      const parts = e.fecha ? e.fecha.split(/[-/]/) : [];
      const iso = parts.length === 3 ? (parts[0].length === 4 ? e.fecha : `${parts[2]}-${parts[1]}-${parts[0]}`) : '';
      if (fechaDesde && iso && iso < fechaDesde) return false;
      if (fechaHasta && iso && iso > fechaHasta) return false;
    }
    return true;
  });

  const totalNeto     = entries.reduce((s, e) => s + e.neto, 0);
  const totalIva      = entries.reduce((s, e) => s + e.iva, 0);
  const totalTotal    = entries.reduce((s, e) => s + e.total, 0);
  const debitoFiscal  = ventasEntries.reduce((s, e) => s + e.iva, 0);
  const creditoFiscal = comprasEntries.reduce((s, e) => s + e.iva, 0);
  const saldoIva      = debitoFiscal - creditoFiscal;

  const showToast = (icon, msg, isErr = false) => { setToast({ icon, msg, isErr }); setTimeout(() => setToast(null), 3500); };

  const handleFiles = useCallback((files, mode) => {
    const arr = Array.from(files);
    const setter = mode === 'ventas' ? setVentasQueue : setComprasQueue;
    setter(q => [...q, ...arr.map(f => ({ file: f, status: 'pending' }))]);
  }, []);

  const buildComprasForm = d => {
    if (!d) return { fecha: '', tipo: 'B', nro: '', proveedor: '', cuit: '', cuit_rec: '', concepto: '', categoria: 'otros', alicuota: 21, total: 0, neto: 0, iva: 0, cae: '', confianza: 0, ...calcBreakdown(0, 0, 21) };
    const catKey = d.categoria || 'otros', alicuota = d.alicuota ?? CATEGORIES[catKey]?.alicuota ?? 21, total = d.total || 0;
    let neto = d.neto || 0, iva = d.iva || 0;
    if (d.tipo_comprobante === 'C') { neto = total; iva = 0; }
    else if (!d.iva_discriminado && iva && total) { neto = total - iva; }
    else if (!d.iva_discriminado && alicuota > 0 && total) { neto = total / (1 + alicuota / 100); iva = total - neto; }
    const n21 = d.neto_gravado_21 ?? 0, i21 = d.iva_21 ?? 0;
    const n105 = d.neto_gravado_105 ?? 0, i105 = d.iva_105 ?? 0;
    const n27 = d.neto_gravado_27 ?? 0, i27 = d.iva_27 ?? 0;
    const hasBreakdown = (n21 + n105 + n27) > 0;
    if (hasBreakdown) { neto = n21 + n105 + n27; iva = i21 + i105 + i27; }
    const breakdown = hasBreakdown
      ? { neto21: n21, iva21: i21, neto105: n105, iva105: i105, neto27: n27, iva27: i27, noGrav: 0, exento: 0 }
      : calcBreakdown(neto, iva, alicuota);
    return { fecha: d.fecha || '', tipo: d.tipo_comprobante || 'B', nro: d.nro_comprobante || '', proveedor: d.proveedor || '', cuit: d.cuit_proveedor || '', cuit_rec: d.cuit_receptor || '', concepto: d.concepto || '', categoria: catKey, alicuota, total, neto, iva, cae: d.cae || '', confianza: d.confianza || 0, ...breakdown };
  };

  const buildVentasForm = d => {
    if (!d) return { fecha: '', tipo: 'B', nro: '', pto_venta: '', nro_comp: '', cliente: '', cuit_cli: '', concepto: '', categoria: 'otros', alicuota: 21, total: 0, neto: 0, iva: 0, cae: '', confianza: 0, ...calcBreakdown(0, 0, 21) };
    const catKey = d.categoria || 'otros', alicuota = d.alicuota ?? CATEGORIES[catKey]?.alicuota ?? 21, total = d.total || 0;
    let neto = d.neto || 0, iva = d.iva || 0;
    if (d.tipo_comprobante === 'C') { neto = total; iva = 0; }
    else if (!d.iva_discriminado && iva && total) { neto = total - iva; }
    else if (!d.iva_discriminado && alicuota > 0 && total) { neto = total / (1 + alicuota / 100); iva = total - neto; }
    const nroParts = (d.nro_comprobante || '').split('-');
    return { fecha: d.fecha || '', tipo: d.tipo_comprobante || 'B', nro: d.nro_comprobante || '', pto_venta: nroParts[0] || '', nro_comp: nroParts[1] || '', cliente: d.cliente || '', cuit_cli: d.cuit_cliente || '', concepto: d.concepto || '', categoria: catKey, alicuota, total, neto, iva, cae: d.cae || '', confianza: d.confianza || 0, ...calcBreakdown(neto, iva, alicuota) };
  };

  const processQueue = async mode => {
    const isC = mode === 'compras';
    const q = isC ? comprasQueue : ventasQueue;
    const setQ = isC ? setComprasQueue : setVentasQueue;
    const setProc = isC ? setComprasProc : setVentasProc;
    const endpoint = isC ? '/api/procesar-factura' : '/api/procesar-venta';
    const buildForm = isC ? buildComprasForm : buildVentasForm;
    const setE = isC ? setComprasEntries : setVentasEntries;
    setProc(true);
    for (const item of q.filter(x => x.status === 'pending')) {
      setQ(q => q.map(x => x.file === item.file ? { ...x, status: 'processing' } : x));
      try {
        const base64 = await fileToBase64(item.file);
        const rawType = item.file.type || '';
        const validImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const mediaType = validImages.includes(rawType) ? rawType : (rawType === 'application/pdf' ? 'application/pdf' : 'image/jpeg');
        const res = await authFetch(endpoint, { method: 'POST', body: JSON.stringify({ imageBase64: base64, mediaType }) });
        const json = await res.json();
        const aiData = res.ok ? json.data : null;
        if (!res.ok) showToast('⚠️', json.error || 'Error de API', true);
        if (aiData?.cae) {
          try {
            const caeChk = await authFetch(`/api/facturas?cae=${encodeURIComponent(aiData.cae)}&cliente_id=${id}`);
            const caeJ = await caeChk.json();
            if (caeJ.data?.length > 0) {
              showToast('ℹ️', `Factura ya cargada (CAE ${aiData.cae}) — se omite`, false);
              setQ(q => q.map(x => x.file === item.file ? { ...x, status: 'done' } : x));
              continue;
            }
          } catch (e) { console.error('Error verificando CAE:', e); }
        }
        const entry = await new Promise(resolve => { resolveRef.current = resolve; setModal({ file: item.file, data: aiData, mode }); setForm(buildForm(aiData)); });
        if (entry) {
          const cuit = mode === 'ventas' ? entry.cuit_cli : entry.cuit;
          let cuit_entidad = cuit || null;
          if (cuit) {
            try {
              const chk = await authFetch(`/api/entidades?cuit=${encodeURIComponent(cuit)}`);
              const chkJ = await chk.json();
              if (!chkJ.data) {
                const nombre = mode === 'ventas' ? entry.cliente : entry.proveedor;
                const tipo = mode === 'ventas' ? 'cliente' : 'proveedor';
                const confirmed = await new Promise(resolve => { entityResolveRef.current = resolve; setEntityModal({ nombre, cuit, tipo }); setEntityForm({ nombre: nombre || '' }); });
                if (confirmed) await authFetch('/api/entidades', { method: 'POST', body: JSON.stringify({ cuit, nombre: confirmed.nombre, tipo }) });
              }
            } catch (e) { console.error('Error verificando entidad:', e); }
          }
          let saved = false;
          try {
            const payload = { ...entryToDb(entry, mode, period, id), cuit_entidad };
            console.log('[processQueue] POST /api/facturas payload:', JSON.stringify(payload));
            const saveRes = await authFetch('/api/facturas', { method: 'POST', body: JSON.stringify(payload) });
            const saveJson = await saveRes.json();
            console.log('[processQueue] POST /api/facturas response:', saveRes.status, JSON.stringify(saveJson));
            if (!saveRes.ok) throw new Error(saveJson.error || saveJson.details?.message || `HTTP ${saveRes.status}`);
            setE(e => [...e, dbToEntry({ ...saveJson.data, libro: mode })]);
            saved = true;
          } catch (err) {
            console.error('[processQueue] Error guardando factura:', err);
            showToast('⚠️', 'Error al guardar: ' + err.message, true);
          }
          setQ(q => q.map(x => x.file === item.file ? { ...x, status: saved ? 'done' : 'error' } : x));
        } else {
          setQ(q => q.map(x => x.file === item.file ? { ...x, status: 'done' } : x));
        }
      } catch (err) { console.error(err); showToast('⚠️', 'Error procesando archivo', true); setQ(q => q.map(x => x.file === item.file ? { ...x, status: 'error' } : x)); }
    }
    setProc(false); showToast('✅', 'Procesamiento completado');
  };

  const updateForm = (key, val) => {
    if (['cuit','cuit_cli','cuit_rec'].includes(key)) val = formatCuit(val);
    if (key === 'fecha') val = formatFecha(val);
    setForm(f => {
      const u = { ...f, [key]: val };
      const BREAKDOWN_KEYS = ['neto21','iva21','neto105','iva105','neto27','iva27','noGrav','exento'];
      if (BREAKDOWN_KEYS.includes(key)) {
        if (key === 'neto21')  u.iva21  = Math.round((parseFloat(val)||0) * 0.21  * 100) / 100;
        if (key === 'neto105') u.iva105 = Math.round((parseFloat(val)||0) * 0.105 * 100) / 100;
        if (key === 'neto27')  u.iva27  = Math.round((parseFloat(val)||0) * 0.27  * 100) / 100;
        u.neto  = (parseFloat(u.neto21)||0)+(parseFloat(u.neto105)||0)+(parseFloat(u.neto27)||0)+(parseFloat(u.noGrav)||0)+(parseFloat(u.exento)||0);
        u.iva   = (parseFloat(u.iva21)||0)+(parseFloat(u.iva105)||0)+(parseFloat(u.iva27)||0);
        u.total = u.neto + u.iva;
        return u;
      }
      if (key === 'categoria') {
        u.alicuota = CATEGORIES[val]?.alicuota ?? 21;
        if (u.total > 0) { const a = u.alicuota; if (u.tipo === 'C' || a === 0) { u.neto = u.total; u.iva = 0; } else { u.neto = u.total / (1 + a/100); u.iva = u.total - u.neto; } }
        Object.assign(u, calcBreakdown(u.neto, u.iva, u.alicuota));
      }
      if (key === 'alicuota') { const a = parseFloat(val)||0, t = parseFloat(u.total)||0; if (u.tipo === 'C' || a === 0) { u.neto = t; u.iva = 0; } else { u.neto = t/(1+a/100); u.iva = t-u.neto; } Object.assign(u, calcBreakdown(u.neto, u.iva, a)); }
      if (key === 'total') { const a = parseFloat(u.alicuota)||0, t = parseFloat(val)||0; if (u.tipo === 'C' || a === 0) { u.neto = t; u.iva = 0; } else { u.neto = t/(1+a/100); u.iva = t-u.neto; } Object.assign(u, calcBreakdown(u.neto, u.iva, u.alicuota)); }
      if (key === 'neto') { const n = parseFloat(val)||0, a = parseFloat(u.alicuota)||0; u.iva = n*a/100; u.total = n+u.iva; Object.assign(u, calcBreakdown(n, u.iva, u.alicuota)); }
      if (key === 'iva') { u.total = (parseFloat(u.neto)||0)+(parseFloat(val)||0); Object.assign(u, calcBreakdown(u.neto, parseFloat(val)||0, u.alicuota)); }
      if (key === 'tipo' && val === 'C') { u.alicuota = 0; u.iva = 0; u.neto = parseFloat(u.total)||0; Object.assign(u, calcBreakdown(u.neto, 0, 0)); }
      return u;
    });
  };

  const openManualModal = () => {
    setEditingId(null);
    const mode = activeTab;
    setModal({ file: null, data: null, mode, manual: true });
    setForm(mode === 'compras' ? buildComprasForm(null) : buildVentasForm(null));
  };

  const openEditModal = entry => {
    const mode = isCompras ? 'compras' : 'ventas';
    const hasBreakdown = ((entry.neto21 || 0) + (entry.neto105 || 0) + (entry.neto27 || 0)) > 0;
    const bd = hasBreakdown
      ? { neto21: entry.neto21, iva21: entry.iva21, neto105: entry.neto105, iva105: entry.iva105, neto27: entry.neto27, iva27: entry.iva27, noGrav: entry.noGrav ?? 0, exento: entry.exento ?? 0 }
      : calcBreakdown(entry.neto, entry.iva, entry.alicuota);
    const base = { fecha: entry.fecha, tipo: entry.tipo, nro: entry.nro, concepto: entry.concepto, categoria: entry.categoria, alicuota: entry.alicuota, total: entry.total, neto: entry.neto, iva: entry.iva, cae: entry.cae || '', confianza: 0, ...bd };
    const nroParts = !isCompras ? (entry.nro || '').split('-') : [];
    const formData = isCompras
      ? { ...base, proveedor: entry.proveedor, cuit: entry.cuit, cuit_rec: entry.cuit_rec || '' }
      : { ...base, cliente: entry.cliente, cuit_cli: entry.cuit_cli, pto_venta: nroParts[0] || '', nro_comp: nroParts[1] || '' };
    setEditingId(entry.id);
    setModal({ file: null, data: null, mode, edit: true });
    setForm(formData);
  };

  const confirmEntry = async () => {
    const isV = modal?.mode === 'ventas';
    const libro = modal?.mode;
    const netoFinal = (parseFloat(form.neto21)||0)+(parseFloat(form.neto105)||0)+(parseFloat(form.neto27)||0)+(parseFloat(form.noGrav)||0)+(parseFloat(form.exento)||0) || parseFloat(form.neto)||0;
    const ivaFinal  = (parseFloat(form.iva21)||0)+(parseFloat(form.iva105)||0)+(parseFloat(form.iva27)||0) || parseFloat(form.iva)||0;
    const breakdown = { neto21: parseFloat(form.neto21)||0, iva21: parseFloat(form.iva21)||0, neto105: parseFloat(form.neto105)||0, iva105: parseFloat(form.iva105)||0, neto27: parseFloat(form.neto27)||0, iva27: parseFloat(form.iva27)||0, noGrav: parseFloat(form.noGrav)||0, exento: parseFloat(form.exento)||0 };
    const nroVentas = `${String(form.pto_venta||'').replace(/\D/g,'').padStart(5,'0')}-${String(form.nro_comp||'').replace(/\D/g,'').padStart(8,'0')}`;
    const entry = isV
      ? { id: editingId || Date.now(), fecha: form.fecha, tipo: form.tipo, nro: nroVentas, cliente: form.cliente, cuit_cli: form.cuit_cli, concepto: form.concepto, categoria: form.categoria, alicuota: parseFloat(form.alicuota), neto: netoFinal, iva: ivaFinal, total: netoFinal + ivaFinal, cae: form.cae, ...breakdown }
      : { id: editingId || Date.now(), fecha: form.fecha, tipo: form.tipo, nro: form.nro, proveedor: form.proveedor, cuit: form.cuit, cuit_rec: form.cuit_rec, concepto: form.concepto, categoria: form.categoria, alicuota: parseFloat(form.alicuota), neto: netoFinal, iva: ivaFinal, total: netoFinal + ivaFinal, cae: form.cae, ...breakdown };
    if (modal?.manual || modal?.edit) {
      const setE = libro === 'compras' ? setComprasEntries : setVentasEntries;
      setModal(null); setEditingId(null);
      try {
        if (modal?.edit && editingId) {
          const res = await authFetch(`/api/facturas/${editingId}`, { method: 'PATCH', body: JSON.stringify(entryToDb(entry, libro, period, id)) });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error);
          setE(prev => prev.map(e => e.id === editingId ? dbToEntry({ ...json.data, libro }) : e));
          showToast('✓', 'Comprobante actualizado');
        } else {
          const res = await authFetch('/api/facturas', { method: 'POST', body: JSON.stringify({ ...entryToDb(entry, libro, period, id), cuit_entidad: null }) });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error);
          setE(prev => [...prev, dbToEntry(json.data)]);
          showToast('✓', (isV ? entry.cliente : entry.proveedor) || 'Comprobante guardado');
        }
      } catch (err) { showToast('⚠️', 'Error: ' + err.message, true); }
    } else {
      setModal(null);
      if (resolveRef.current) { resolveRef.current(entry); resolveRef.current = null; }
      showToast('✓', (isV ? entry.cliente : entry.proveedor) || 'Comprobante guardado');
    }
  };

  const cancelModal    = () => { setModal(null); setEditingId(null); if (resolveRef.current) { resolveRef.current(null); resolveRef.current = null; } };
  const confirmEntity  = () => { setEntityModal(null); if (entityResolveRef.current) { entityResolveRef.current({ nombre: entityForm.nombre }); entityResolveRef.current = null; } };
  const skipEntity     = () => { setEntityModal(null); if (entityResolveRef.current) { entityResolveRef.current(null); entityResolveRef.current = null; } };
  const handleDelete   = async (entryId, libro) => {
    const res = await authFetch(`/api/facturas/${entryId}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast('⚠️', d.error || 'Error al eliminar', true);
      return;
    }
    if (libro === 'compras') setComprasEntries(x => x.filter(r => r.id !== entryId));
    else setVentasEntries(x => x.filter(r => r.id !== entryId));
  };

  const isVentasModal = modal?.mode === 'ventas';
  const previewUrl    = modal?.file?.type?.startsWith('image/') ? URL.createObjectURL(modal.file) : null;
  const initials      = (user?.user_metadata?.name || user?.email || 'U').slice(0, 2).toUpperCase();

  if (user === undefined || user === null) {
    return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font, color: C.muted, fontSize: 14 }}>Cargando…</div>;
  }

  return (
    <>
      <Head><title>{cliente ? `${cliente.nombre} — CIA` : 'Cliente — CIA'}</title></Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:${C.bg};color:${C.text};font-family:${C.font};min-height:100vh;}
        ::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
        input,select,button{font-family:${C.font};}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        .tr-hover:hover td{background:#f5f7fa;}
        .menu-item:hover{background:#f5f7fa;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── TOPBAR ── */}
      <header style={{ background: C.navy, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
              <rect x="8" y="4" width="30" height="38" rx="3" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="2"/>
              <path d="M15 15h16M15 22h12M15 29h14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="39" cy="40" r="12" fill={C.accent}/>
              <path d="M33 40l4.5 4.5L46 34" stroke={C.navy} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 20, letterSpacing: '2px' }}>CIA</span>
          </Link>
        </div>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '6px 12px 6px 8px', color: 'white', cursor: 'pointer' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.navy, flexShrink: 0 }}>
              {initials}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.user_metadata?.name || user?.email}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>

          {menu && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, width: 230, boxShadow: '0 8px 28px rgba(0,0,0,0.13)', overflow: 'hidden', animation: 'fadeIn 0.15s ease', zIndex: 100 }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{user?.user_metadata?.name || '—'}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{user?.email}</div>
              </div>
              <div style={{ padding: '6px 0' }}>
                {rol === 'admin' && (
                  <>
                    <Link href="/configuracion" onClick={() => setMenu(false)} className="menu-item"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: C.text, textDecoration: 'none' }}>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2.5" stroke={C.muted} strokeWidth="1.3"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.7 2.7l1.06 1.06M11.24 11.24l1.06 1.06M2.7 12.3l1.06-1.06M11.24 3.76l1.06-1.06" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round"/></svg>
                      Configuración
                    </Link>
                    <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
                  </>
                )}
                <button onClick={() => signOut().then(() => router.replace('/login'))} className="menu-item"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.red, fontWeight: 600, textAlign: 'left' }}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10 11l3-3.5L10 4M13 7.5H5.5M5.5 2H2v11h3.5" stroke={C.red} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 22, fontSize: 13 }}>
          <Link href="/" style={{ color: C.muted, textDecoration: 'none', fontWeight: 500 }}>Inicio</Link>
          <span style={{ color: C.border }}>›</span>
          <span style={{ color: C.text, fontWeight: 600 }}>
            {pageLoading ? '…' : cliente?.nombre || 'Cliente'}
          </span>
        </div>

        {pageLoading ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: '80px 0', fontSize: 14 }}>Cargando…</div>
        ) : pageError ? (
          <div style={{ textAlign: 'center', color: C.red, padding: '80px 0', fontSize: 14 }}>{pageError}</div>
        ) : cliente ? (
          <>
            {/* ── Client header ── */}
            <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, background: '#e8f3fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: C.navy, flexShrink: 0 }}>
                  {cliente.nombre[0].toUpperCase()}
                </div>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{cliente.nombre}</h1>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cliente.empresas?.map(e => (
                      <span key={e.id} style={{ background: '#e8f3fd', color: C.navy, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: C.mono }}>
                        {e.cuit}
                      </span>
                    ))}
                    {!cliente.empresas?.length && <span style={{ color: C.muted, fontSize: 12 }}>Sin empresas</span>}
                  </div>
                </div>
              </div>

              {/* Period selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Período</span>
                <select value={period} onChange={e => setPeriod(e.target.value)}
                  style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '7px 12px', color: C.navy, fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                  {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* ── Main tabs ── */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 4, width: 'fit-content', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {[
                { key: 'iva',       label: 'Liquidación de IVA', enabled: true  },
                { key: 'sueldos',   label: 'Sueldos',            enabled: false },
                { key: 'documentos',label: 'Documentos',         enabled: false },
              ].map(t => (
                <button key={t.key} onClick={() => t.enabled && setMainTab(t.key)}
                  style={{ padding: '8px 18px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: t.enabled ? 'pointer' : 'not-allowed', transition: 'all 0.15s', background: mainTab === t.key ? C.navy : 'transparent', color: mainTab === t.key ? 'white' : t.enabled ? C.muted : '#c0c8d0', opacity: t.enabled ? 1 : 0.6 }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── IVA Content ── */}
            {mainTab === 'iva' && (
              <>
                {/* IVA Position bar */}
                <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '16px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center', flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Débito fiscal</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.red, fontFamily: C.mono }}>$ {fmt(debitoFiscal)}</div>
                  </div>
                  <div style={{ fontSize: 22, color: C.muted, padding: '0 12px', fontWeight: 300 }}>−</div>
                  <div style={{ textAlign: 'center', flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Crédito fiscal</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.green, fontFamily: C.mono }}>$ {fmt(creditoFiscal)}</div>
                  </div>
                  <div style={{ fontSize: 22, color: C.muted, padding: '0 12px', fontWeight: 300 }}>=</div>
                  <div style={{ textAlign: 'center', flex: 1, minWidth: 140, background: saldoIva > 0 ? '#fef2f2' : saldoIva < 0 ? '#f0fdf4' : '#f8fafc', borderRadius: 10, padding: '10px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      {saldoIva > 0 ? 'Saldo técnico a favor de ARCA' : saldoIva < 0 ? 'Saldo técnico a favor del contribuyente' : 'Saldo'}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: saldoIva > 0 ? C.red : saldoIva < 0 ? C.green : C.muted, fontFamily: C.mono }}>
                      $ {fmt(Math.abs(saldoIva))}
                    </div>
                  </div>
                </div>

                {/* Sub-tabs compras/ventas */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 2, background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, padding: 3 }}>
                    {[{ key: 'compras', label: 'Compras' }, { key: 'ventas', label: 'Ventas' }].map(t => (
                      <button key={t.key} onClick={() => setActiveTab(t.key)}
                        style={{ padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: activeTab === t.key ? C.navy : 'transparent', color: activeTab === t.key ? 'white' : C.muted, transition: 'all 0.15s' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4 stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                  {(isCompras ? [
                    { label: 'Comprobantes',      val: comprasEntries.length,   mono: false, color: C.navy    },
                    { label: 'Neto gravado',       val: '$ ' + fmt(totalNeto),  mono: true,  color: '#0369a1' },
                    { label: 'IVA crédito fiscal', val: '$ ' + fmt(totalIva),   mono: true,  color: C.green   },
                    { label: 'Total',              val: '$ ' + fmt(totalTotal), mono: true,  color: C.navy    },
                  ] : [
                    { label: 'Comprobantes',      val: ventasEntries.length,    mono: false, color: C.navy    },
                    { label: 'Neto gravado',       val: '$ ' + fmt(totalNeto),  mono: true,  color: '#0369a1' },
                    { label: 'IVA débito fiscal',  val: '$ ' + fmt(totalIva),   mono: true,  color: C.red     },
                    { label: 'Total',              val: '$ ' + fmt(totalTotal), mono: true,  color: C.navy    },
                  ]).map(s => (
                    <div key={s.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: s.mono ? C.mono : C.font, fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
                    </div>
                  ))}
                </div>

                {/* Two-column: upload + table */}
                <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 16, alignItems: 'start' }}>

                  {/* Upload panel */}
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                      {isCompras ? 'Facturas recibidas' : 'Facturas emitidas'}
                    </div>

                    {/* Drop zone */}
                    <div
                      onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files, activeTab); }}
                      onDragOver={e => e.preventDefault()}
                      onClick={() => fileRef.current?.click()}
                      style={{ border: `2px dashed ${C.border}`, borderRadius: 10, padding: '22px 12px', textAlign: 'center', cursor: 'pointer', background: '#fafbfc', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.background = '#e8f3fd'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = '#fafbfc'; }}>
                      <input ref={fileRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files, activeTab)} />
                      <svg width="34" height="34" viewBox="0 0 36 36" fill="none" style={{ margin: '0 auto 8px' }}>
                        <rect x="6" y="4" width="18" height="22" rx="2" stroke={C.muted} strokeWidth="1.5"/>
                        <path d="M10 10h10M10 14h7M10 18h5" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="26" cy="26" r="8" fill={C.navy}/>
                        <path d="M23 26l2.5 2.5L29 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3 }}>Arrastrá las facturas aquí</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Imágenes o PDFs</div>
                    </div>

                    {/* Queue */}
                    {queue.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 180, overflowY: 'auto' }}>
                        {queue.map((item, i) => {
                          const sc = { pending: C.muted, processing: C.yellow, done: C.green, error: C.red }[item.status];
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#fafbfc', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 4, background: C.border, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                                {item.file.type?.startsWith('image/') ? <img src={URL.createObjectURL(item.file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📄'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: C.text }}>{item.file.name}</div>
                                <div style={{ fontSize: 10, color: sc, marginTop: 1 }}>
                                  {{ pending: 'Pendiente', processing: 'Procesando…', done: 'Listo', error: 'Error' }[item.status]}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button onClick={() => processQueue(activeTab)}
                      disabled={processing || !queue.some(q => q.status === 'pending')}
                      style={{ width: '100%', marginTop: 12, padding: '10px', background: C.navy, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (processing || !queue.some(q => q.status === 'pending')) ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                      {processing ? 'Procesando…' : 'Procesar con IA'}
                    </button>
                    <button onClick={openManualModal}
                      style={{ width: '100%', marginTop: 7, padding: '9px', background: 'none', color: C.navy, border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      + Cargar manualmente
                    </button>

                    <div style={{ marginTop: 14, padding: '10px 12px', background: '#fafbfc', border: `1px solid ${C.border}`, borderRadius: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Alícuotas IVA</div>
                      {[['Servicios públicos', '27%'], ['Servicios / Honorarios', '21%'], ['Insumos básicos', '10,5%'], ['Exento / Monotributo', '0%']].map(([l, v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                          <span style={{ color: C.muted }}>{l}</span>
                          <span style={{ fontWeight: 700, color: C.navy, fontFamily: C.mono }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table panel */}
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

                    {/* Table toolbar */}
                    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {/* Search */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8f9fb', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 10px' }}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke={C.muted} strokeWidth="1.3"/><path d="M9.5 9.5l2 2" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round"/></svg>
                            <input placeholder={isCompras ? 'Buscar proveedor…' : 'Buscar cliente…'} value={search} onChange={e => setSearch(e.target.value)}
                              style={{ background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 12, width: 130, fontFamily: C.font }} />
                          </div>
                          {/* Alicuota filters */}
                          {['all', '21', '10.5', '27'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                              style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${filter === f ? C.navy : C.border}`, background: filter === f ? C.navy : 'transparent', color: filter === f ? 'white' : C.muted, transition: 'all 0.15s' }}>
                              {f === 'all' ? 'Todos' : f + '%'}
                            </button>
                          ))}
                          {/* Advanced search toggle */}
                          {(() => {
                            const active = !!(search || filter !== 'all' || fechaDesde || fechaHasta || advCat || advMin || advMax);
                            return (
                              <button onClick={() => setAdvOpen(v => !v)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${advOpen || active ? C.navy : C.border}`, background: advOpen ? C.navy : (active ? '#e8f0fa' : 'transparent'), color: advOpen ? 'white' : (active ? C.navy : C.muted), transition: 'all 0.15s' }}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                                Búsqueda avanzada
                                {active && <span style={{ background: C.accent, color: C.navy, borderRadius: '50%', width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{[search, filter!=='all', fechaDesde, fechaHasta, advCat, advMin, advMax].filter(Boolean).length}</span>}
                              </button>
                            );
                          })()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.muted }}>{filtered.length} comprobante{filtered.length !== 1 ? 's' : ''}</span>
                          <button onClick={() => exportXLS(comprasEntries, ventasEntries, period, cliente?.nombre || 'cliente')}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: C.navy, cursor: 'pointer' }}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v7M4 6l3 3 3-3M2 10v2h10v-2" stroke={C.navy} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Exportar Excel
                          </button>
                          <button onClick={() => exportARCA(comprasEntries, ventasEntries, period)} style={{padding:'7px 14px', background:'#1a3a5c', color:'white', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer'}}>
                            Exportar ARCA (ZIP)
                          </button>
                          <button onClick={() => exportPDF(comprasEntries, 'compras', period, cliente?.nombre || 'cliente')} style={{padding:'7px 14px', background:'none', border:`1.5px solid ${C.border}`, borderRadius:'8px', fontSize:'12px', fontWeight:'600', color:C.navy, cursor:'pointer'}}>
                            PDF Compras
                          </button>
                          <button onClick={() => exportPDF(ventasEntries, 'ventas', period, cliente?.nombre || 'cliente')} style={{padding:'7px 14px', background:'none', border:`1.5px solid ${C.border}`, borderRadius:'8px', fontSize:'12px', fontWeight:'600', color:C.navy, cursor:'pointer'}}>
                            PDF Ventas
                          </button>
                        </div>
                      </div>
                      {/* Advanced search panel */}
                      {advOpen && (
                        <div style={{ background: '#f8f9fb', border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                              <div style={advLbl}>{isCompras ? 'Proveedor / CUIT' : 'Cliente / CUIT'}</div>
                              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o CUIT…" style={advInp(180)} />
                            </div>
                            <div>
                              <div style={advLbl}>Fecha desde</div>
                              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={advInp(140)} />
                            </div>
                            <div>
                              <div style={advLbl}>Fecha hasta</div>
                              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={advInp(140)} />
                            </div>
                            <div>
                              <div style={advLbl}>Alícuota</div>
                              <select value={filter} onChange={e => setFilter(e.target.value)} style={advInp(110)}>
                                <option value="all">Todas</option>
                                <option value="21">21%</option>
                                <option value="10.5">10,5%</option>
                                <option value="27">27%</option>
                              </select>
                            </div>
                            <div>
                              <div style={advLbl}>Categoría</div>
                              <select value={advCat} onChange={e => setAdvCat(e.target.value)} style={advInp(130)}>
                                <option value="">Todas</option>
                                {Object.entries(CATEGORIES).map(([k, v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <div style={advLbl}>Importe mínimo</div>
                              <input type="number" value={advMin} onChange={e => setAdvMin(e.target.value)} placeholder="0" style={advInp(100)} />
                            </div>
                            <div>
                              <div style={advLbl}>Importe máximo</div>
                              <input type="number" value={advMax} onChange={e => setAdvMax(e.target.value)} placeholder="0" style={advInp(100)} />
                            </div>
                          </div>
                          <div>
                            <button onClick={() => { setSearch(''); setFilter('all'); setFechaDesde(''); setFechaHasta(''); setAdvCat(''); setAdvMin(''); setAdvMax(''); }}
                              style={{ padding: '5px 14px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: C.muted, cursor: 'pointer' }}>
                              Limpiar filtros
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#f8f9fb', borderBottom: `1px solid ${C.border}` }}>
                            {(isCompras
                              ? ['#', 'Fecha', 'Comprobante', 'Proveedor', 'CUIT', 'Concepto', 'Cat.', 'Alíc.', 'Neto', 'No Grav.', 'Exento', 'IVA CF', 'Total', '']
                              : ['#', 'Fecha', 'Comprobante', 'Cliente', 'CUIT', 'Concepto', 'Cat.', 'Alíc.', 'Neto', 'No Grav.', 'Exento', 'IVA DF', 'Total', '']
                            ).map(h => (
                              <th key={h} style={{ padding: '9px 10px', textAlign: ['Neto', 'No Grav.', 'Exento', 'IVA CF', 'IVA DF', 'Total'].includes(h) ? 'right' : 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dbLoading ? (
                            <tr><td colSpan={14} style={{ padding: '40px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Cargando…</td></tr>
                          ) : filtered.length === 0 ? (
                            <tr><td colSpan={14} style={{ padding: '48px', textAlign: 'center', color: C.muted }}>
                              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3 }}>{entries.length > 0 ? 'Sin resultados' : 'Listo para procesar'}</div>
                              <div style={{ fontSize: 12 }}>{entries.length > 0 ? 'Cambiá los filtros' : 'Cargá facturas y presioná Procesar con IA'}</div>
                            </td></tr>
                          ) : filtered.map((e, i) => (
                            <tr key={e.id} className="tr-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ padding: '9px 10px', color: C.muted, fontFamily: C.mono }}>{i + 1}</td>
                              <td style={{ padding: '9px 10px', fontFamily: C.mono, color: C.muted, whiteSpace: 'nowrap' }}>{e.fecha}</td>
                              <td style={{ padding: '9px 10px', fontFamily: C.mono, fontSize: 11, whiteSpace: 'nowrap' }}>
                                <span style={{ background: '#e8f3fd', color: C.navy, border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 5px', fontWeight: 700 }}>F{e.tipo}</span>
                                {' '}{e.nro}
                              </td>
                              <td style={{ padding: '9px 10px', fontWeight: 600, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isCompras ? e.proveedor : e.cliente}</td>
                              <td style={{ padding: '9px 10px', fontFamily: C.mono, fontSize: 11, color: C.muted }}>{isCompras ? e.cuit : e.cuit_cli}</td>
                              <td style={{ padding: '9px 10px', color: C.muted, maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={e.concepto}>{e.concepto || '—'}</td>
                              <td style={{ padding: '9px 10px', fontSize: 11, color: C.muted }}>{CATEGORIES[e.categoria]?.label || e.categoria}</td>
                              <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                                <span style={{ fontFamily: C.mono, fontSize: 11, background: '#e8f3fd', color: C.navy, borderRadius: 4, padding: '2px 5px', fontWeight: 700 }}>
                                  {[(e.neto21 > 0) && '21%', (e.neto105 > 0) && '10,5%', (e.neto27 > 0) && '27%'].filter(Boolean).join(' / ') || `${e.alicuota}%`}
                                </span>
                              </td>
                              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: C.mono, fontWeight: 500, whiteSpace: 'nowrap' }}>$ {fmt(e.alicuota > 0 ? e.neto : 0)}</td>
                              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: C.mono, color: C.muted, whiteSpace: 'nowrap', fontSize: 11 }}>$ {fmt(e.alicuota === 0 ? e.neto : 0)}</td>
                              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: C.mono, color: C.muted, whiteSpace: 'nowrap', fontSize: 11 }}>$ {fmt(0)}</td>
                              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: C.mono, color: isCompras ? C.green : C.red, whiteSpace: 'nowrap' }}>$ {fmt(e.iva)}</td>
                              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: C.mono, fontWeight: 700, whiteSpace: 'nowrap' }}>$ {fmt(e.total)}</td>
                              <td style={{ padding: '9px 8px' }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button onClick={() => openEditModal(e)}
                                    style={{ width: 24, height: 24, background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', color: C.muted, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar">✎</button>
                                  {(rol === 'admin' || !e.uploaded_by || e.uploaded_by === user?.id) && (
                                    <button onClick={() => handleDelete(e.id, isCompras ? 'compras' : 'ventas')}
                                      style={{ width: 24, height: 24, background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', color: C.muted, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar">✕</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {entries.length > 0 && (
                      <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, background: '#f8f9fb', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {[
                          { l: 'Neto 21%',   v: entries.reduce((s, e) => s + (e.neto21  || 0), 0) },
                          { l: 'Neto 10,5%', v: entries.reduce((s, e) => s + (e.neto105 || 0), 0) },
                          { l: 'Neto 27%',   v: entries.reduce((s, e) => s + (e.neto27  || 0), 0) },
                          { l: isCompras ? 'Total IVA CF' : 'Total IVA DF', v: totalIva, bold: true },
                        ].map(s => (
                          <div key={s.l} style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</div>
                            <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: s.bold ? 700 : 500, color: s.bold ? C.navy : C.text }}>$ {fmt(s.v)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        ) : null}
      </main>

      {/* ── MODAL FACTURA ── */}
      {modal && (
        <div onClick={cancelModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.navy, borderRadius: '12px 12px 0 0' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
                {modal?.edit ? 'Editar comprobante' : modal?.manual ? (isVentasModal ? 'Nueva factura de venta' : 'Nueva factura de compra') : (isVentasModal ? 'Revisar factura de venta' : 'Revisar factura de compra')}
              </span>
              <button onClick={cancelModal} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'white', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              {previewUrl && <img src={previewUrl} style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 14, background: '#f8fafc' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {!modal?.manual && !modal?.edit && (
                  <>
                    <span style={{ fontSize: 11, color: C.muted }}>Confianza IA:</span>
                    <div style={{ width: 70, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(form.confianza || 0) * 100}%`, background: C.navy, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>{Math.round((form.confianza || 0) * 100)}%</span>
                  </>
                )}
                {form.tipo === 'B' && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: C.yellow, border: '1px solid #fde68a' }}>Factura B — IVA incluido</span>}
                {form.tipo === 'C' && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: C.muted, border: `1px solid ${C.border}` }}>Monotributo</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Fecha',            key: 'fecha',    placeholder: 'DD/MM/YYYY',    span: 1 },
                  { label: 'Tipo',             key: 'tipo',     type: 'select', opts: ['A', 'B', 'C', 'M'], span: 1 },
                  ...(isVentasModal ? [
                    { label: 'Pto. de Venta',    key: 'pto_venta', placeholder: '00001',    span: 1, maxLen: 5 },
                    { label: 'Nro. Comprobante', key: 'nro_comp',  placeholder: '00000001', span: 1, maxLen: 8 },
                  ] : [
                    { label: 'Nro. Comprobante', key: 'nro',       placeholder: '0001-00000001', span: 2 },
                  ]),
                  ...(isVentasModal ? [
                    { label: 'Cliente',        key: 'cliente',  placeholder: 'Razón social',  span: 2 },
                    { label: 'CUIT Cliente',   key: 'cuit_cli', placeholder: '20-12345678-9', span: 2 },
                  ] : [
                    { label: 'Proveedor',      key: 'proveedor', placeholder: 'Razón social', span: 2 },
                    { label: 'CUIT Proveedor', key: 'cuit',      placeholder: '20-12345678-9', span: 1 },
                    { label: 'CUIT Receptor',  key: 'cuit_rec',  placeholder: '20-12345678-9', span: 1 },
                  ]),
                  { label: 'Concepto', key: 'concepto', placeholder: 'Descripción', span: 2 },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: `span ${f.span}` }}>
                    <label style={lbl}>{f.label}</label>
                    {f.type === 'select'
                      ? <select value={form[f.key] || ''} onChange={e => updateForm(f.key, e.target.value)} style={inp}>{f.opts.map(o => <option key={o}>{o}</option>)}</select>
                      : <input value={form[f.key] || ''} onChange={e => updateForm(f.key, e.target.value)} placeholder={f.placeholder} maxLength={f.maxLen} style={inp} />
                    }
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lbl}>Categoría</label>
                  <select value={form.categoria || 'otros'} onChange={e => updateForm('categoria', e.target.value)} style={inp}>
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.alicuota}%)</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Alícuota principal</label>
                  <select value={form.alicuota ?? 21} onChange={e => updateForm('alicuota', e.target.value)} style={inp}>
                    {[21, 10.5, 27, 0].map(a => <option key={a} value={a}>{a}%</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Total Factura</label>
                  <input type="number" value={form.total || 0} onChange={e => updateForm('total', e.target.value)} step="0.01" style={inp} />
                </div>
                <div style={{ gridColumn: 'span 2', borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Desglose por alícuota</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Neto 21%',    key: 'neto21',  color: C.text  },
                      { label: 'IVA 21%',     key: 'iva21',   color: C.green },
                      { label: 'Neto 10,5%',  key: 'neto105', color: C.text  },
                      { label: 'IVA 10,5%',   key: 'iva105',  color: C.green },
                      { label: 'Neto 27%',    key: 'neto27',  color: C.text  },
                      { label: 'IVA 27%',     key: 'iva27',   color: C.green },
                      { label: 'No Gravado',  key: 'noGrav',  color: C.text  },
                      { label: 'Exento',      key: 'exento',  color: C.text  },
                    ].map(({ label, key, color }) => (
                      <div key={key}>
                        <label style={lbl}>{label}</label>
                        <input type="number" value={form[key] ?? 0} onChange={e => updateForm(key, e.target.value)} step="0.01" style={{ ...inp, color, fontWeight: 600, fontSize: 12 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'flex-end', fontSize: 12 }}>
                    <span style={{ color: C.muted }}>Neto total: <strong style={{ fontFamily: C.mono, color: C.text }}>$ {fmt(form.neto || 0)}</strong></span>
                    <span style={{ color: C.muted }}>{isVentasModal ? 'IVA DF' : 'IVA CF'}: <strong style={{ fontFamily: C.mono, color: isVentasModal ? C.red : C.green }}>$ {fmt(form.iva || 0)}</strong></span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={cancelModal} style={{ padding: '9px 18px', background: C.white, color: C.muted, border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmEntry} style={{ padding: '9px 22px', background: C.navy, color: 'white', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Confirmar y guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVA ENTIDAD ── */}
      {entityModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: '#e8f3fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 5v5l3 3" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="8" stroke={C.navy} strokeWidth="1.5"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Nuevo {entityModal.tipo} detectado</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>¿Guardarlo en tu listado de entidades?</div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>CUIT</label>
              {entityModal.cuit
                ? <div style={{ ...inp, background: '#f8fafc', color: C.muted }}>{entityModal.cuit}</div>
                : <div style={{ padding: '10px 12px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: C.red, fontSize: 12, fontWeight: 600 }}>⚠️ No se detectó CUIT</div>
              }
            </div>
            {entityModal.cuit && (
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Nombre / Razón social</label>
                <input value={entityForm.nombre} onChange={e => setEntityForm(f => ({ ...f, nombre: e.target.value }))} style={inp} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={skipEntity} style={{ padding: '8px 16px', background: C.white, color: C.muted, border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Omitir</button>
              {entityModal.cuit && <button onClick={confirmEntity} style={{ padding: '8px 18px', background: C.navy, color: 'white', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Guardar entidad</button>}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.white, border: `1px solid ${toast.isErr ? '#fecaca' : C.border}`, borderLeft: `4px solid ${toast.isErr ? C.red : C.green}`, borderRadius: 8, padding: '11px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, zIndex: 300, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', animation: 'slideUp 0.2s ease', color: C.text }}>
          <span>{toast.icon}</span><span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
