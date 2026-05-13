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
  "proveedor": "Nombre legal exacto del emisor (quien firma y emite la factura). Solo la razón social del proveedor, sin incluir datos del receptor ni información adicional.",
  "cuit_proveedor": "20-12345678-9",
  "cuit_receptor": "20-12345678-9",
  "concepto": "Descripción breve del bien o servicio",
  "categoria": "servicios" | "honorarios" | "alquileres" | "insumos" | "servicios_pub" | "transporte" | "repuestos" | "otros",
  "alicuota": 21 | 10.5 | 27 | 0,
  "total": 1234.56,
  "neto": 1020.66,
  "iva": 214.34,
  "neto_gravado_21": 1020.66,
  "iva_21": 214.34,
  "neto_gravado_105": 0,
  "iva_105": 0,
  "neto_gravado_27": 0,
  "iva_27": 0,
  "iva_discriminado": true | false,
  "cae": "12345678901234",
  "confianza": 0.95
}

Reglas:
- Usá null para campos que no puedas leer.
- "total" es el importe total del comprobante (con IVA si está incluido).
- "neto" es la base imponible total (sin IVA, suma de todas las alícuotas). Si la factura es tipo C (monotributo), neto = total e iva = 0.
- "iva" es el IVA total (suma de todas las alícuotas).
- Si el comprobante tiene ítems gravados a distintas alícuotas, discriminalos correctamente. Por ejemplo si hay productos al 21% y al 10.5%, devolvé: neto_gravado_21: solo el neto de los ítems al 21%, iva_21: solo el IVA de esos ítems, neto_gravado_105: solo el neto de los ítems al 10.5%, iva_105: solo el IVA de esos ítems. NO sumes todo en una sola alícuota. Si ves en el comprobante líneas con distintos porcentajes de IVA, respetá cada una por separado.
- "alicuota": la alícuota principal o dominante (servicios públicos = 27, insumos básicos = 10.5, monotributo = 0, resto = 21).
- "iva_discriminado": true si el IVA aparece como línea separada en la factura; false si está incluido en el total.
- "confianza": número entre 0 y 1 indicando tu certeza sobre la extracción (1 = muy seguro).
- "categoria": elegí la más apropiada según el rubro del proveedor o el concepto.
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

  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const isPdf = mediaType === 'application/pdf';
  const safeMediaType = validImageTypes.includes(mediaType) ? mediaType : 'image/jpeg';
  const fileBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
    : { type: 'image',    source: { type: 'base64', media_type: safeMediaType,       data: imageBase64 } };

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
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
