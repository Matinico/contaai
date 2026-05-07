import Anthropic from '@anthropic-ai/sdk';
import { verifyAuth } from '../../lib/verify-auth';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `Analizá esta factura o comprobante argentino y devolvé ÚNICAMENTE un objeto JSON válido, sin texto antes ni después, con esta estructura exacta:

{
  "fecha": "DD/MM/AAAA",
  "tipo_comprobante": "A" | "B" | "C" | "M",
  "nro_comprobante": "0001-00000001",
  "proveedor": "Razón social del emisor",
  "cuit_proveedor": "20-12345678-9",
  "cuit_receptor": "20-12345678-9",
  "concepto": "Descripción breve del bien o servicio",
  "categoria": "servicios" | "honorarios" | "alquileres" | "insumos" | "servicios_pub" | "transporte" | "repuestos" | "otros",
  "alicuota": 21 | 10.5 | 27 | 0,
  "total": 1234.56,
  "neto": 1020.66,
  "iva": 214.34,
  "iva_discriminado": true | false,
  "cae": "12345678901234",
  "confianza": 0.95
}

Reglas:
- Usá null para campos que no puedas leer.
- "total" es el importe total del comprobante (con IVA si está incluido).
- "neto" es la base imponible (sin IVA). Si la factura es tipo C (monotributo), neto = total e iva = 0.
- "iva_discriminado": true si el IVA aparece como línea separada en la factura; false si está incluido en el total.
- "confianza": número entre 0 y 1 indicando tu certeza sobre la extracción (1 = muy seguro).
- "categoria": elegí la más apropiada según el rubro del proveedor o el concepto.
- "alicuota": la alícuota de IVA correspondiente (servicios públicos = 27, insumos básicos = 10.5, monotributo = 0, resto = 21).
- Solo el JSON, sin markdown ni explicaciones.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { imageBase64, mediaType } = req.body ?? {};

  if (!imageBase64) {
    return res.status(400).json({ error: 'Falta imageBase64 en el body' });
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const safeMediaType = validTypes.includes(mediaType) ? mediaType : 'image/jpeg';

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: safeMediaType, data: imageBase64 },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    const raw = message.content[0]?.text ?? '';

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(502).json({ error: 'La IA no devolvió JSON válido', raw });
    }

    const data = JSON.parse(match[0]);
    return res.status(200).json({ data });
  } catch (err) {
    console.error('Error en procesar-factura:', err);
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: 'JSON malformado en la respuesta de IA' });
    }
    return res.status(500).json({ error: err.message ?? 'Error interno del servidor' });
  }
}
