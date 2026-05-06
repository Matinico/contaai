import { useState, useRef } from 'react';

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1]);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };

    img.src = url;
  });
}

function Campo({ label, valor }) {
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <div style={{ marginBottom: '0.4rem' }}>
      <span style={{ fontWeight: 600, color: '#555' }}>{label}: </span>
      <span>{String(valor)}</span>
    </div>
  );
}

function FacturaView({ factura }) {
  return (
    <div style={{ background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 8, padding: '1.5rem', marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Datos extraídos</h2>

      <Campo label="Tipo" valor={factura.tipo_comprobante} />
      <Campo label="Número" valor={factura.numero_comprobante} />
      <Campo label="Fecha" valor={factura.fecha} />
      <Campo label="Moneda" valor={factura.moneda} />

      {factura.emisor && (
        <div style={{ marginTop: '1rem' }}>
          <strong>Emisor</strong>
          <Campo label="Nombre" valor={factura.emisor.nombre} />
          <Campo label="CUIT" valor={factura.emisor.cuit} />
          <Campo label="Dirección" valor={factura.emisor.direccion} />
        </div>
      )}

      {factura.receptor?.nombre && (
        <div style={{ marginTop: '1rem' }}>
          <strong>Receptor</strong>
          <Campo label="Nombre" valor={factura.receptor.nombre} />
          <Campo label="CUIT" valor={factura.receptor.cuit} />
        </div>
      )}

      {factura.items?.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <strong>Items</strong>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={th}>Descripción</th>
                <th style={th}>Cant.</th>
                <th style={th}>P. Unit.</th>
                <th style={th}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {factura.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{item.descripcion}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{item.cantidad ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(item.precio_unitario)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(item.importe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '1rem', textAlign: 'right' }}>
        {factura.subtotal != null && <Campo label="Subtotal" valor={fmt(factura.subtotal)} />}
        {factura.impuestos?.map((imp, i) => (
          <Campo key={i} label={imp.nombre} valor={fmt(imp.importe)} />
        ))}
        {factura.total != null && (
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.4rem' }}>
            Total: {fmt(factura.total)}
          </div>
        )}
      </div>

      {factura.observaciones && (
        <div style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
          <strong>Observaciones:</strong> {factura.observaciones}
        </div>
      )}
    </div>
  );
}

const th = { padding: '6px 8px', textAlign: 'left', fontWeight: 600 };
const td = { padding: '6px 8px' };
const fmt = (n) => (n != null ? `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—');

export default function Home() {
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setFactura(null);
    setError('');
    setLoading(true);

    try {
      const base64 = await fileToBase64(file);

      const res = await fetch('/api/procesar-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }

      setFactura(data.factura);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>ContaAI</h1>
      <p style={{ color: '#666', marginTop: 0 }}>Subí una foto de tu factura o comprobante para extraer los datos automáticamente.</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ marginBottom: '1rem' }}
      />

      {preview && (
        <img
          src={preview}
          alt="Vista previa"
          style={{ maxWidth: '100%', maxHeight: 360, display: 'block', marginBottom: '1rem', borderRadius: 8, border: '1px solid #ddd' }}
        />
      )}

      {loading && <p style={{ color: '#888' }}>Analizando factura…</p>}

      {error && (
        <p style={{ color: '#c00', background: '#fff0f0', padding: '0.75rem', borderRadius: 6 }}>
          <strong>Error:</strong> {error}
        </p>
      )}

      {factura && <FacturaView factura={factura} />}
    </main>
  );
}
