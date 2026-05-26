export const prerender = false;

import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const FROM = import.meta.env.EMAIL_FROM || 'CPCC <onboarding@resend.dev>';
const TO = 'criminalisticacolegio@gmail.com';

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const titulo  = (formData.get('titulo')  || '').toString().trim();
    const resumen = (formData.get('resumen') || '').toString().trim();
    const pdfFile = formData.get('pdf');

    if (!titulo || !resumen) {
      return new Response(JSON.stringify({ error: 'Título y resumen son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const attachments = [];
    if (pdfFile && typeof pdfFile === 'object' && pdfFile.size > 0) {
      const buffer = Buffer.from(await pdfFile.arrayBuffer());
      attachments.push({ filename: pdfFile.name || 'propuesta.pdf', content: buffer });
    }

    const { error } = await resend.emails.send({
      from: FROM,
      to: [TO],
      subject: `Nueva propuesta: ${titulo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
          <div style="background: #1b5e20; padding: 28px 40px;">
            <h1 style="color: white; margin: 0; font-size: 17px; font-weight: 700;">Nueva propuesta recibida desde el portal</h1>
          </div>
          <div style="padding: 32px; background: white;">
            <p style="font-size: 13px; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Título de la propuesta:</p>
            <p style="font-size: 18px; font-weight: 700; color: #1b5e20; margin: 0 0 24px;">${titulo}</p>
            <p style="font-size: 13px; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;">Resumen / Objetivos:</p>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; font-size: 14px; color: #333; line-height: 1.6; white-space: pre-wrap;">${resumen}</div>
            ${attachments.length > 0 ? '<p style="margin-top: 20px; font-size: 13px; color: #666;">📎 Se adjuntó un archivo PDF.</p>' : ''}
          </div>
          <div style="background: #1b5e20; padding: 14px 40px; text-align: center;">
            <p style="color: rgba(255,255,255,0.65); font-size: 11px; margin: 0;">CPCC — Portal Institucional</p>
          </div>
        </div>
      `,
      attachments,
    });

    if (error) {
      console.error('[api/propuesta] Error Resend:', error);
      return new Response(JSON.stringify({ error: 'Error al enviar la propuesta' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[api/propuesta] Error:', err);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
