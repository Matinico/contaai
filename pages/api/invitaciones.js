import { supabase } from '../../lib/supabase';
import { verifyAuth } from '../../lib/verify-auth';
import { Resend } from 'resend';

const APP_URL = 'https://contaai-seven.vercel.app';

async function sendInvitationEmail(toEmail, estudioNombre, token) {
  const link = `${APP_URL}/invitacion?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY no configurada — email no enviado. Link:', link);
    return { link, sent: false };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from:    'CIA <onboarding@resend.dev>',
      to:      toEmail,
      subject: `Te invitaron a unirte a ${estudioNombre} en CIA`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
          <h2 style="color:#1a3a5c;margin-bottom:8px;">Fuiste invitado/a</h2>
          <p style="color:#64748b;margin-bottom:24px;">
            <strong>${estudioNombre}</strong> te invitó a unirte como operador en CIA —
            la plataforma de contabilidad con inteligencia artificial.
          </p>
          <a href="${link}"
            style="display:inline-block;background:#1a3a5c;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px;">
            Aceptar invitación
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
            Este link expira en 7 días. Si no esperabas esta invitación, podés ignorar este mensaje.
          </p>
        </div>
      `,
    });
    return { link, sent: true };
  } catch (err) {
    console.error('Resend error:', err);
    return { link, sent: false };
  }
}

export default async function handler(req, res) {

  // ── GET ?token=XXX — public, no auth required ────────────────────────────
  if (req.method === 'GET') {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token requerido.' });

    const { data: inv, error } = await supabase
      .from('invitaciones')
      .select('id, email, usado, estudio_id, estudios(nombre)')
      .eq('token', token)
      .maybeSingle();

    if (error || !inv) return res.status(404).json({ error: 'Invitación no encontrada.' });
    if (inv.usado)     return res.status(410).json({ error: 'Esta invitación ya fue usada.' });

    return res.status(200).json({
      email:          inv.email,
      estudio_nombre: inv.estudios?.nombre || '',
      estudio_id:     inv.estudio_id,
    });
  }

  // ── POST — create invitation (admin only) ────────────────────────────────
  if (req.method === 'POST') {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const { data: membership } = await supabase
      .from('usuarios_estudio')
      .select('rol, estudio_id, estudios(nombre)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership)            return res.status(404).json({ error: 'No pertenecés a ningún estudio.' });
    if (membership.rol !== 'admin') return res.status(403).json({ error: 'Solo el admin puede invitar.' });

    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'El email es obligatorio.' });

    // Check for existing active invitation to same email+estudio
    const { data: existing } = await supabase
      .from('invitaciones')
      .select('id, token')
      .eq('estudio_id', membership.estudio_id)
      .eq('email', email.toLowerCase().trim())
      .eq('usado', false)
      .maybeSingle();

    let token;
    if (existing) {
      token = existing.token;
    } else {
      const { data: inv, error: invErr } = await supabase
        .from('invitaciones')
        .insert({ estudio_id: membership.estudio_id, email: email.toLowerCase().trim() })
        .select()
        .single();

      if (invErr) return res.status(500).json({ error: invErr.message });
      token = inv.token;
    }

    const { link, sent } = await sendInvitationEmail(
      email.trim(),
      membership.estudios?.nombre || 'tu estudio',
      token,
    );

    return res.status(201).json({ ok: true, link, sent });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
