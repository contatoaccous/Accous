import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_EMAIL = 'contato@accous.com.br';
const FROM_ADDRESS = 'Accous Site <no-reply@send.accous.com.br>';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Serviço de e-mail indisponível' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const nome = clean(body.nome, 120);
  const empresa = clean(body.empresa, 180);
  const email = clean(body.email, 180);
  const whatsapp = clean(body.whatsapp, 40);
  const setor = clean(body.setor, 60);
  const mensagem = clean(body.mensagem, 4000);
  const lgpd = body.lgpd === true || body.lgpd === 'true' || body.lgpd === 'on';

  const missing = [];
  if (!nome) missing.push('nome');
  if (!empresa) missing.push('empresa');
  if (!email) missing.push('email');
  if (!whatsapp) missing.push('whatsapp');
  if (!setor) missing.push('setor');
  if (!mensagem) missing.push('mensagem');
  if (!lgpd) missing.push('lgpd');

  if (missing.length > 0) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes', missing });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }

  const subject = `Novo contato pelo site — ${nome} (${empresa})`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #2B2929; max-width: 640px;">
      <div style="background: linear-gradient(135deg, #FFAA56, #FF4141); color: #fff; padding: 20px 24px; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0; font-size: 20px;">Novo contato via site Accous</h2>
      </div>
      <div style="background: #fff; border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 10px 10px;">
        <table style="width:100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color:#666; width: 140px;">Nome</td><td style="padding: 6px 0; font-weight:600;">${escapeHtml(nome)}</td></tr>
          <tr><td style="padding: 6px 0; color:#666;">Empresa / CNPJ</td><td style="padding: 6px 0; font-weight:600;">${escapeHtml(empresa)}</td></tr>
          <tr><td style="padding: 6px 0; color:#666;">E-mail</td><td style="padding: 6px 0; font-weight:600;">${escapeHtml(email)}</td></tr>
          <tr><td style="padding: 6px 0; color:#666;">WhatsApp</td><td style="padding: 6px 0; font-weight:600;">${escapeHtml(whatsapp)}</td></tr>
          <tr><td style="padding: 6px 0; color:#666;">Setor</td><td style="padding: 6px 0; font-weight:600;">${escapeHtml(setor)}</td></tr>
        </table>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee;">
          <div style="color:#666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Mensagem</div>
          <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(mensagem)}</div>
        </div>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
          Enviado automaticamente pelo formulário de contato de accous.com.br
        </div>
      </div>
    </div>
  `;

  const text = [
    `Nome: ${nome}`,
    `Empresa / CNPJ: ${empresa}`,
    `E-mail: ${email}`,
    `WhatsApp: ${whatsapp}`,
    `Setor: ${setor}`,
    '',
    'Mensagem:',
    mensagem
  ].join('\n');

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [CONTACT_EMAIL],
      reply_to: email,
      subject,
      html,
      text
    });
    if (error) {
      return res.status(502).json({ error: 'Falha ao enviar e-mail' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
}
