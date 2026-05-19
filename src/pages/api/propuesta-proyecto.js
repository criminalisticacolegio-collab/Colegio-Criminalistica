export const prerender = false;

import { createClient } from '@sanity/client';
import { Resend } from 'resend';

const sanity = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const FROM = import.meta.env.EMAIL_FROM || 'CPC CTM <onboarding@resend.dev>';
const ADMIN = 'criminalisticacolegio@gmail.com';

const tipoLabels = {
  institucional: 'Proyecto institucional',
  sugerencia: 'Sugerencia',
  mejora: 'Propuesta de mejora',
  otro: 'Otro',
};

export async function POST({ request }) {
  try {
    const fd = await request.formData();
    const titulo = fd.get('titulo');
    const tipo = fd.get('tipo');
    const descripcion = fd.get('descripcion');
    const nombre = fd.get('nombre');
    const email = fd.get('email');
    const matricula = fd.get('matricula');
    const adjuntosRaw = fd.getAll('adjuntos').filter(f => f && f.size > 0);

    if (!titulo?.trim() || !tipo || !descripcion?.trim() || !nombre?.trim() || !email?.trim()) {
      return new Response(JSON.stringify({ error: 'Campos requeridos incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fechaEnvio = new Date().toISOString().split('T')[0];

    // Upload adjuntos to Sanity assets
    const archivosAdjuntos = [];
    for (const file of adjuntosRaw.slice(0, 3)) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const asset = await sanity.assets.upload('file', buffer, {
          filename: file.name || 'adjunto',
          contentType: file.type || 'application/octet-stream',
        });
        archivosAdjuntos.push({ _type: 'file', _key: asset._id, asset: { _type: 'reference', _ref: asset._id } });
      } catch (uploadErr) {
        console.error('[propuesta-proyecto] Error subiendo adjunto:', uploadErr);
      }
    }

    await sanity.create({
      _type: 'proyectos',
      titulo: titulo.trim(),
      tipo,
      descripcion: descripcion.trim(),
      nombreRemitente: nombre.trim(),
      emailRemitente: email.trim().toLowerCase(),
      matricula: matricula?.trim() || null,
      estado: 'Recibido',
      fechaEnvio,
      ...(archivosAdjuntos.length > 0 && { archivosAdjuntos }),
    });

    const tipoLabel = tipoLabels[tipo] || tipo;

    // Notify admin
    await resend.emails.send({
      from: FROM,
      reply_to: email.trim(),
      to: [ADMIN],
      subject: `Nueva propuesta recibida: ${titulo.trim()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
          <div style="background: #1b5e20; padding: 28px 40px;">
            <h1 style="color: white; margin: 0; font-size: 17px; font-weight: 700;">Nueva propuesta institucional recibida</h1>
          </div>
          <div style="padding: 32px; background: white;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 24px;">
              <tr><td style="padding: 8px 0; color: #666; width: 30%;">Título:</td><td style="font-weight: 700; color: #1b5e20; font-size: 16px;">${titulo.trim()}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Tipo:</td><td style="font-weight: 600; color: #111;">${tipoLabel}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Remitente:</td><td style="font-weight: 600; color: #111;">${nombre.trim()}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Email:</td><td><a href="mailto:${email.trim()}" style="color: #1b5e20; font-weight: 600;">${email.trim()}</a></td></tr>
              ${matricula?.trim() ? `<tr><td style="padding: 8px 0; color: #666;">Matrícula:</td><td style="font-weight: 600; color: #111;">${matricula.trim()}</td></tr>` : ''}
              <tr><td style="padding: 8px 0; color: #666;">Fecha:</td><td style="font-weight: 600; color: #111;">${fechaEnvio}</td></tr>
            </table>
            <p style="font-size: 13px; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;">Descripción / Objetivos:</p>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; font-size: 14px; color: #333; line-height: 1.6; white-space: pre-wrap;">${descripcion.trim()}</div>
            <p style="margin-top: 20px; font-size: 13px; color: #666; line-height: 1.5;">La propuesta fue guardada en Sanity con estado <strong>Recibido</strong>. Podés gestionarla desde el panel de administración.</p>
          </div>
          <div style="background: #1b5e20; padding: 14px 40px; text-align: center;">
            <p style="color: rgba(255,255,255,0.65); font-size: 11px; margin: 0;">CPC CTM — Portal Institucional</p>
          </div>
        </div>
      `,
    });

    // Confirm to submitter
    await resend.emails.send({
      from: FROM,
      to: [email.trim()],
      subject: 'CPC CTM — Recibimos tu propuesta',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
          <div style="background: #1b5e20; padding: 32px 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700; line-height: 1.4;">
              Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
            </h1>
          </div>
          <div style="padding: 40px; background: white;">
            <h2 style="color: #1b5e20; font-size: 22px; margin: 0 0 12px;">¡Propuesta recibida! ✅</h2>
            <p style="color: #444; line-height: 1.6; margin: 0 0 24px;">
              Hola <strong>${nombre.trim()}</strong>, tu propuesta fue recibida y registrada correctamente.
              Las autoridades del Colegio la evaluarán y te responderemos por este email a la brevedad.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h3 style="color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px;">Datos de tu propuesta</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 6px 0; color: #666; width: 35%;">Título:</td><td style="color: #111; font-weight: 700;">${titulo.trim()}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">Tipo:</td><td style="color: #111; font-weight: 600;">${tipoLabel}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">Fecha:</td><td style="color: #111; font-weight: 600;">${fechaEnvio}</td></tr>
              </table>
            </div>
            <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 0;">
              Si tenés consultas adicionales, contactanos en secretaría o respondé este email.
            </p>
          </div>
          <div style="background: #1b5e20; padding: 20px 40px; text-align: center;">
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
              CPC CTM · San Fernando del Valle de Catamarca · criminalisticacolegio@gmail.com
            </p>
          </div>
        </div>
      `,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[api/propuesta-proyecto] Error:', err);
    return new Response(JSON.stringify({ error: 'Error interno al procesar la propuesta' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
