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
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      // Strip the "data:image/jpeg;base64," prefix
      resolve(dataUrl.split(',')[1]);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };

    img.src = url;
  });
}

export default function Home() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setResult('');
    setError('');
    setLoading(true);

    try {
      const base64 = await fileToBase64(file);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>ContaAI — Análisis Contable</h1>
      <p>Subí una foto de tu factura o comprobante para analizarla con IA.</p>

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
          style={{ maxWidth: '100%', maxHeight: 400, display: 'block', marginBottom: '1rem', borderRadius: 8 }}
        />
      )}

      {loading && <p>Analizando imagen…</p>}

      {error && (
        <p style={{ color: 'red' }}>
          <strong>Error:</strong> {error}
        </p>
      )}

      {result && (
        <div style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
          {result}
        </div>
      )}
    </main>
  );
}
