import { transporter, FROM } from '../../lib/mailer.js';

export const prerender = false;

export async function GET({ request }) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (secret !== import.meta.env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: FROM,
      to: import.meta.env.ADMIN_EMAIL || import.meta.env.GMAIL_USER,
      subject: 'Test SMTP — CPCC OK',
      html: '<p>Este es un email de prueba. Si llegó, el SMTP funciona correctamente.</p>',
    });
    return new Response(JSON.stringify({ ok: true, message: 'Email de prueba enviado correctamente.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message, code: err.code }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
