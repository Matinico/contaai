import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Falta el campo image' });
  }

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
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: 'Sos un asistente contable. Analizá este comprobante o factura y extraé: fecha, número de comprobante, proveedor/emisor, CUIT, items con descripción e importe, subtotal, impuestos y total. Respondé en español, con formato claro.',
            },
          ],
        },
      ],
    });

    const result = message.content[0]?.text ?? '';
    return res.status(200).json({ result });
  } catch (err) {
    console.error('Anthropic error:', err);
    return res.status(500).json({ error: err.message ?? 'Error interno' });
  }
}
