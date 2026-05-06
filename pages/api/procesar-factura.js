import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `Analizá esta factura o comprobante y devolvé ÚNICAMENTE un objeto JSON válido con esta estructura exacta, sin texto adicional antes ni después:

{
  "fecha": "DD/MM/AAAA o null",
  "numero_comprobante": "string o null",
  "tipo_comprobante": "Factura A / Factura B / Ticket / Remito / etc. o null",
  "emisor": {
    "nombre": "string o null",
    "cuit": "string o null",
    "direccion": "string o null"
  },
  "receptor": {
    "nombre": "string o null",
    "cuit": "string o null"
  },
  "items": [
    {
      "descripcion": "string",
      "cantidad": number_o_null,
      "precio_unitario": number_o_null,
      "importe": number_o_null
    }
  ],
  "subtotal": number_o_null,
  "impuestos": [
    { "nombre": "IVA 21% / Percepción / etc.", "importe": number }
  ],
  "total": number_o_null,
  "moneda": "ARS / USD / etc. o null",
  "observaciones": "string o null"
}

Reglas:
- Usá null para campos que no puedas leer o que no existan en el comprobante.
- Los importes deben ser números (sin símbolos ni puntos de miles).
- No incluyas texto explicativo, solo el JSON.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { image } = req.body ?? {};
  if (!image) {
    return res.status(400).json({ error: 'Falta el campo image en el body' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    const raw = message.content[0]?.text ?? '';

    // Extraer el JSON aunque Claude agregue texto extra
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(502).json({ error: 'La IA no devolvió JSON válido', raw });
    }

    const factura = JSON.parse(match[0]);
    return res.status(200).json({ ok: true, factura });
  } catch (err) {
    console.error('Error en procesar-factura:', err);
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: 'JSON malformado en respuesta de IA' });
    }
    return res.status(500).json({ error: err.message ?? 'Error interno' });
  }
}
